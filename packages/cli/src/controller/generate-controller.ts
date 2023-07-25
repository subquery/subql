// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {FunctionFragment, EventFragment} from '@ethersproject/abi/src.ts/fragments';
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
import {upperFirst, difference} from 'lodash';
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

export async function promptSelectables(
  method: 'event' | 'function',
  availableMethods: Record<string, FunctionFragment | EventFragment>,
  input: string | undefined,
  abiName: string
): Promise<string[]> {
  console.log(method, ': ', Object.keys(availableMethods));
  const memArr: string[] = [];
  if (input === '*') {
    return Object.keys(availableMethods);
  } else if (!input) {
    const chosenFn = await inquirer.prompt({
      name: method,
      message: `Select ${method}`,
      type: 'checkbox',
      choices: Object.keys(availableMethods),
    });
    memArr.push(...chosenFn[method]);
  } else {
    const inputs = input.split(',').map((input) => input.trim().toLowerCase());
    const methodKeys = Object.keys(availableMethods);
    const lowerCasedMethodNames = methodKeys.map((key) => availableMethods[key].name.toLowerCase());

    return inputs
      .map((userInput) => {
        const i = lowerCasedMethodNames.indexOf(userInput);
        if (i !== -1) {
          return methodKeys[i];
        } else {
          throw new Error(chalk.red(`"${userInput}" is not a valid ${method} on ABI: ${abiName}`));
        }
      })
      .filter(Boolean);
  }
  return memArr;
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

export function filterExistingMethods(
  userInput: UserInput,
  datasource: EthereumDs[]
): [SelectedMethod[], SelectedMethod[]] {
  const existingEvents: string[] = [];
  const existingFunctions: string[] = [];

  datasource.map((ds: EthereumDs) => {
    ds.mapping.handlers.map((handler) => {
      if (Object.keys(handler.filter).includes('topics')) {
        const topic = (handler.filter as EthereumLogFilter).topics[0];
        if (!existingEvents.includes(topic)) {
          existingEvents.push(topic);
        }
      }
      if (Object.keys(handler.filter).includes('function')) {
        const fn = (handler.filter as EthereumTransactionFilter).function;
        if (!existingFunctions.includes(fn)) {
          existingFunctions.push(fn);
        }
      }
    });
  });
  const cleanedEvents = userInput.events.filter((e) => {
    if (!existingEvents.includes(e.method)) {
      return e;
    }
  });
  const cleanedFunctions = userInput.functions.filter((fn) => {
    if (!existingFunctions.includes(fn.method.toLowerCase())) return fn;
  });
  return [cleanedEvents, cleanedFunctions];
}

export async function generateManifest(projectPath: string, manifestPath: string, userInput: UserInput): Promise<void> {
  try {
    const existingManifest = (await fs.promises.readFile(path.join(projectPath, manifestPath), 'utf8')) as any;
    const existingManifestData = parseDocument(existingManifest);
    const clonedExistingManifestData = existingManifestData.clone();

    const existingDatasource = existingManifestData.get('dataSources') as any;

    const [cleanEvents, cleanFunctions] = filterExistingMethods(userInput, existingDatasource.toJSON() as EthereumDs[]);

    userInput.events = cleanEvents;
    userInput.functions = cleanFunctions;

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
