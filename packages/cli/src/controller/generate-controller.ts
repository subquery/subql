// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {FunctionFragment, EventFragment, ConstructorFragment, Fragment} from '@ethersproject/abi/src.ts/fragments';
import {loadFromJsonOrYaml} from '@subql/common';
import {
  EthereumDatasourceKind,
  EthereumHandlerKind,
  EthereumTransactionFilter,
  SubqlRuntimeHandler,
} from '@subql/common-ethereum';
import {SubqlRuntimeDatasource as EthereumDs, EthereumLogFilter} from '@subql/types-ethereum';
import chalk from 'chalk';
import ejs from 'ejs';
import {Interface} from 'ethers/lib/utils';
import * as inquirer from 'inquirer';
import {upperFirst, difference, intersection, flatten} from 'lodash';
import {parseContractPath} from 'typechain';
import {parseDocument} from 'yaml';
import {SelectedMethod, UserInput} from '../commands/codegen/generate';

interface HandlerPropType {
  name: string;
  argName: string;
  argType: string;
}

interface AbiPropType {
  name: string;
  handlers: HandlerPropType[];
}

const SCAFFOLD_HANDLER_TEMPLATE_PATH = path.resolve(__dirname, '../template/scaffold-handlers.ts.ejs');
const ROOT_MAPPING_DIR = 'src/mappings';
const DEFAULT_HANDLER_BUILD_PATH = './dist/index.js';

export function removeKeyword(inputString: string): string {
  const removeString = inputString.startsWith('event ') ? 'event ' : 'function ';
  if (inputString.startsWith(removeString)) {
    return inputString.slice(removeString.length);
  }
  return inputString;
}

export function constructMethod<T extends ConstructorFragment | Fragment>(
  cleanedFragment: Record<string, T>
): SelectedMethod[] {
  return Object.keys(cleanedFragment).map((f) => {
    return {
      name: cleanedFragment[f].name,
      method: f,
    };
  });
}

export async function promptSelectables<T extends ConstructorFragment | Fragment>(
  method: 'event' | 'function',
  availableMethods: Record<string, T>
): Promise<Record<string, T>> {
  const selectedMethods: Record<string, T> = {};
  const chosenFn = await inquirer.prompt({
    name: method,
    message: `Select ${method}`,
    type: 'checkbox',
    choices: Object.keys(availableMethods),
  });
  const choseArray = chosenFn[method] as string[];
  choseArray.map((choice: string) => {
    selectedMethods[choice] = availableMethods[choice];
  });

  return selectedMethods;
}

export async function renderTemplate(templatePath: string, outputPath: string, templateData: ejs.Data): Promise<void> {
  const data = await ejs.renderFile(templatePath, templateData);
  await fs.promises.writeFile(outputPath, data);
}

export function getAbiInterface(projectPath: string, abiPath: string): Interface {
  const abi = loadFromJsonOrYaml(path.join(projectPath, abiPath)) as any;
  return new Interface(abi);
}

export function filterObjectsByStateMutability(
  obj: Record<string, FunctionFragment>
): Record<string, FunctionFragment> {
  const filteredObject: Record<string, FunctionFragment> = {};
  for (const key in obj) {
    if (obj[key].stateMutability !== 'view') {
      filteredObject[key] = obj[key];
    }
  }
  return filteredObject;
}

export function getFragmentFormats<T extends ConstructorFragment | Fragment>(fragment: T): {full: string; min: string} {
  return {
    full: removeKeyword(fragment.format('full')),
    min: removeKeyword(fragment.format('minimal')),
  };
}

export function generateHandlerName(name: string, abiName: string, type: 'tx' | 'log'): string {
  return `handle${upperFirst(name)}${upperFirst(abiName)}${upperFirst(type)}`;
}

export function constructDatasources(userInput: UserInput): EthereumDs {
  const abiName = parseContractPath(userInput.abiPath).name;
  const formattedHandlers: SubqlRuntimeHandler[] = [];

  userInput.functions.map((fn) => {
    const handler: SubqlRuntimeHandler = {
      handler: generateHandlerName(fn.name, abiName, 'tx'),
      kind: EthereumHandlerKind.Call,
      filter: {
        function: fn.method,
      },
    };
    formattedHandlers.push(handler);
  });

  userInput.events.map((event) => {
    const handler: SubqlRuntimeHandler = {
      handler: generateHandlerName(event.name, abiName, 'log'),
      kind: EthereumHandlerKind.Event,
      filter: {
        topics: [event.method],
      },
    };
    formattedHandlers.push(handler);
  });

  const assets = new Map<string, {file: string}>();
  assets.set(abiName, {file: userInput.abiPath});

  return {
    kind: EthereumDatasourceKind.Runtime,
    startBlock: userInput.startBlock,
    options: {
      abi: abiName,
      address: userInput.address,
    },
    assets: assets,
    mapping: {
      file: DEFAULT_HANDLER_BUILD_PATH,
      handlers: formattedHandlers,
    },
  };
}

// Selected fragments
export async function prepareInputFragments<T extends ConstructorFragment | Fragment>(
  type: 'event' | 'function',
  input: string | undefined,
  availableFragments: Record<string, T>,
  abiName: string
): Promise<Record<string, T>> {
  // input = '' or undefined
  if (input === undefined || input === '') {
    return promptSelectables<T>(type, availableFragments);
  }

  // input = '*' (all Events/Functions)
  if (input === '*') {
    return availableFragments;
  }

  // input = 'transfer,approval'
  const selectedFragments: Record<string, T> = {};
  const inputs = input.split(',').map((input) => input.trim().toLowerCase());

  // all formats of each fragment
  for (const key in availableFragments) {
    if (inputs.includes(availableFragments[key].name.toLowerCase())) {
      selectedFragments[key] = availableFragments[key];
    }
    //   console.log(chalk.red(`"${matchingInputs}" are duplicated on ABI: ${abiName}`));
  }
  return selectedFragments;
}

export function filterExistingMethods(
  eventFragments: Record<string, EventFragment>,
  functionFragments: Record<string, FunctionFragment>,
  dataSources: EthereumDs[]
): [Record<string, EventFragment>, Record<string, FunctionFragment>] {
  // find all existing functions and events
  const existingEvents: string[] = [];
  const existingFunctions: string[] = [];

  const cleanEventsFragments: Record<string, EventFragment> = {};
  const cleanFunctionsFragments: Record<string, FunctionFragment> = {};

  dataSources.map((ds) => {
    ds.mapping.handlers.map((handler) => {
      if (Object.keys(handler.filter).includes('topics')) {
        // topic[0] is the method
        existingEvents.push((handler.filter as EthereumLogFilter).topics[0]);
      }
      if (Object.keys(handler.filter).includes('function')) {
        existingFunctions.push((handler.filter as EthereumTransactionFilter).function);
      }
    });
  });

  for (const key in eventFragments) {
    const fragmentFormats = Object.values(getFragmentFormats<EventFragment>(eventFragments[key])).concat(key);
    const diff = difference(fragmentFormats, existingEvents);
    if (diff.length === fragmentFormats.length) {
      diff.map((fragKey) => {
        if (eventFragments[fragKey]) {
          cleanEventsFragments[fragKey] = eventFragments[fragKey];
        }
      });
    }
  }
  for (const key in functionFragments) {
    const fragmentFormats = Object.values(getFragmentFormats<FunctionFragment>(functionFragments[key])).concat(key);
    const diff = difference(fragmentFormats, existingFunctions);
    if (diff.length !== 0) {
      diff.map((fragKey) => {
        if (functionFragments[fragKey]) {
          cleanFunctionsFragments[fragKey] = functionFragments[fragKey];
        }
      });
    }
  }
  return [cleanEventsFragments, cleanFunctionsFragments];
}

export async function getManifestData(projectPath: string, manifestPath: string): Promise<any> {
  const existingManifest = (await fs.promises.readFile(path.join(projectPath, manifestPath), 'utf8')) as any;
  return parseDocument(existingManifest);
}

export async function generateManifest(
  projectPath: string,
  manifestPath: string,
  userInput: UserInput,
  existingManifestData: any
): Promise<void> {
  try {
    const clonedExistingManifestData = existingManifestData.clone();
    const existingDatasource = existingManifestData.get('dataSources') as any;

    const newDataSourcesData = existingDatasource.toJSON().concat(...[constructDatasources(userInput)]);
    clonedExistingManifestData.set('dataSources', newDataSourcesData);

    await fs.promises.writeFile(path.join(projectPath, manifestPath), clonedExistingManifestData.toString(), 'utf8');
  } catch (e) {
    throw new Error(e);
  }
}

export function constructHandlerProps(methods: [SelectedMethod[], SelectedMethod[]], abiName: string): AbiPropType {
  const handlers: HandlerPropType[] = [];
  const [events, functions] = methods;

  functions.map((fn) => {
    const fnProp: HandlerPropType = {
      name: `handle${upperFirst(fn.name)}`,
      argName: 'tx',
      argType: `${upperFirst(fn.name)}Transaction`,
    };
    handlers.push(fnProp);
  });

  events.map((event) => {
    const fnProp: HandlerPropType = {
      name: `handle${upperFirst(event.name)}`,
      argName: 'log',
      argType: `${upperFirst(event.name)}Log`,
    };
    handlers.push(fnProp);
  });

  return {
    name: abiName,
    handlers: handlers,
  };
}

export async function generateHandlers(
  selectedMethods: [SelectedMethod[], SelectedMethod[]],
  projectPath: string,
  abiPath: string
): Promise<void> {
  const abiName = parseContractPath(abiPath).name;
  const abiProps = constructHandlerProps(selectedMethods, abiName);

  try {
    await renderTemplate(
      SCAFFOLD_HANDLER_TEMPLATE_PATH,
      path.join(projectPath, ROOT_MAPPING_DIR, `${abiName}Handlers.ts`),
      {
        props: {
          abis: [abiProps],
        },
        helper: {upperFirst},
      }
    );
  } catch (e) {
    console.error(`unable to generate scaffold. ${e.message}`);
  }

  fs.appendFileSync(path.join(projectPath, 'src/index.ts'), `\nexport * from "./mappings/${abiName}Handlers"`);
}
