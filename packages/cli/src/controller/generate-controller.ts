// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import type {ConstructorFragment, EventFragment, Fragment, FunctionFragment} from '@ethersproject/abi';
import {checkbox} from '@inquirer/prompts';
import {NETWORK_FAMILY} from '@subql/common';
import type {
  EthereumDatasourceKind,
  EthereumHandlerKind,
  EthereumLogFilter,
  EthereumTransactionFilter,
  SubqlRuntimeDatasource as EthereumDs,
  SubqlRuntimeHandler,
} from '@subql/types-ethereum';
import chalk from 'chalk';
import {difference, pickBy, upperFirst} from 'lodash';
import {Document, parseDocument, YAMLSeq} from 'yaml';
import {SelectedMethod, UserInput} from '../commands/codegen/generate';
import {ADDRESS_REG, FUNCTION_REG, TOPICS_REG} from '../constants';
import {loadDependency} from '../modulars';
import {
  extractFromTs,
  renderTemplate,
  replaceArrayValueInTsManifest,
  resolveToAbsolutePath,
  splitArrayString,
} from '../utils';

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
export const ROOT_MAPPING_DIR = 'src/mappings';
export const DEFAULT_HANDLER_BUILD_PATH = './dist/index.js';
export const DEFAULT_ABI_DIR = '/abis';

export function removeKeyword(inputString: string): string {
  return inputString.replace(/^(event|function) /, '');
}

export async function prepareAbiDirectory(abiPath: string, rootPath: string): Promise<void> {
  const abiDirPath = path.join(rootPath, DEFAULT_ABI_DIR);

  if (!fs.existsSync(abiDirPath)) {
    await fs.promises.mkdir(abiDirPath, {recursive: true});
  }

  if (fs.existsSync(path.join(abiDirPath, abiPath))) {
    return;
  }

  // Ensure abiPath is an absolute path
  const ensuredAbiPath = resolveToAbsolutePath(abiPath);

  try {
    const abiFileContent = await fs.promises.readFile(ensuredAbiPath, 'utf8');
    await fs.promises.writeFile(path.join(abiDirPath, path.basename(ensuredAbiPath)), abiFileContent);
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      throw new Error(`Unable to find abi at: ${abiPath}`);
    }
  }
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
  const choseArray = await checkbox<string>({
    message: `Select ${method}`,
    choices: Object.keys(availableMethods).map((key) => ({value: key})),
  });
  choseArray.forEach((choice: string) => {
    selectedMethods[choice] = availableMethods[choice];
  });

  return selectedMethods;
}

export function filterObjectsByStateMutability(
  obj: Record<string, FunctionFragment>
): Record<string, FunctionFragment> {
  return pickBy(obj, (e) => e.stateMutability !== 'view');
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

function generateFormattedHandlers(
  userInput: UserInput,
  abiName: string,
  kindModifier: (kind: string) => EthereumHandlerKind | string
): SubqlRuntimeHandler[] {
  const formattedHandlers: SubqlRuntimeHandler[] = [];

  userInput.functions.forEach((fn) => {
    const handler: SubqlRuntimeHandler = {
      handler: generateHandlerName(fn.name, abiName, 'tx'),
      kind: kindModifier('EthereumHandlerKind.Call') as any, // union type
      filter: {
        function: fn.method,
      },
    };
    formattedHandlers.push(handler);
  });

  userInput.events.forEach((event) => {
    const handler: SubqlRuntimeHandler = {
      handler: generateHandlerName(event.name, abiName, 'log'),
      kind: kindModifier('EthereumHandlerKind.Event') as any, // Should be union type
      filter: {
        topics: [event.method],
      },
    };
    formattedHandlers.push(handler);
  });

  return formattedHandlers;
}

export function constructDatasourcesTs(userInput: UserInput): string {
  const ethModule = loadDependency(NETWORK_FAMILY.ethereum);
  const abiName = ethModule.parseContractPath(userInput.abiPath).name;
  const formattedHandlers = generateFormattedHandlers(userInput, abiName, (kind) => kind);
  const handlersString = tsStringify(formattedHandlers);

  return `{
    kind: EthereumDatasourceKind.Runtime,
    startBlock: ${userInput.startBlock},
    options: {
      abi: '${abiName}',
      ${userInput.address && `address: '${userInput.address}',`}
    },
    assets: new Map([['${abiName}', {file: '${userInput.abiPath}'}]]),
    mapping: {
      file: '${DEFAULT_HANDLER_BUILD_PATH}',
      handlers: ${handlersString}
    }
  }`;
}

export function constructDatasourcesYaml(userInput: UserInput): EthereumDs {
  const ethModule = loadDependency(NETWORK_FAMILY.ethereum);
  const abiName = ethModule.parseContractPath(userInput.abiPath).name;
  const formattedHandlers = generateFormattedHandlers(userInput, abiName, (kind) => {
    if (kind === 'EthereumHandlerKind.Call') return 'ethereum/TransactionHandler' as EthereumHandlerKind.Call;
    return 'ethereum/LogHandler' as EthereumHandlerKind.Event;
  });
  const assets = new Map([[abiName, {file: userInput.abiPath}]]);

  return {
    kind: 'ethereum/Runtime' as EthereumDatasourceKind.Runtime,
    startBlock: userInput.startBlock,
    options: {
      abi: abiName,
      ...(userInput.address && {address: userInput.address}),
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
  rawInput: string | undefined,
  availableFragments: Record<string, T>,
  abiName: string
): Promise<Record<string, T>> {
  if (!rawInput) {
    return promptSelectables<T>(type, availableFragments);
  }

  if (rawInput === '*') {
    return availableFragments;
  }

  const selectedFragments: Record<string, T> = {};
  rawInput.split(',').forEach((input) => {
    const casedInput = input.trim().toLowerCase();
    const matchFragment = Object.entries(availableFragments).find((entry) => {
      const [key, value] = entry;
      if (casedInput === availableFragments[key].name.toLowerCase()) {
        selectedFragments[key] = availableFragments[key];
        return value;
      }
    });

    if (!matchFragment) {
      throw new Error(chalk.red(`'${input}' is not a valid ${type} on ${abiName}`));
    }
  });

  return selectedFragments;
}
function filterExistingFragments<T extends Fragment | ConstructorFragment>(
  fragments: Record<string, T>,
  existingMethods: string[]
): Record<string, T> {
  const cleanFragments: Record<string, T> = {};
  for (const key in fragments) {
    const fragmentFormats = Object.values(getFragmentFormats<T>(fragments[key])).concat(key);
    const diff = difference(fragmentFormats, existingMethods);
    if (diff.length === 3) {
      diff.forEach((fragKey) => {
        if (fragments[fragKey]) {
          cleanFragments[fragKey] = fragments[fragKey];
        }
      });
    }
  }

  return cleanFragments;
}

export type ManifestExtractor<T> = (
  dataSources: T,
  casedInputAddress: string | undefined
) => {
  existingEvents: string[];
  existingFunctions: string[];
};

export function filterExistingMethods<T>(
  eventFragments: Record<string, EventFragment>,
  functionFragments: Record<string, FunctionFragment>,
  dataSources: T,
  address: string | undefined,
  extractor: ManifestExtractor<T>
): [Record<string, EventFragment>, Record<string, FunctionFragment>] {
  const {existingEvents, existingFunctions} = extractor(dataSources, address && address.toLowerCase());

  return [
    filterExistingFragments<EventFragment>(eventFragments, existingEvents),
    filterExistingFragments<FunctionFragment>(functionFragments, existingFunctions),
  ];
}

export const yamlExtractor: ManifestExtractor<EthereumDs[]> = (dataSources, casedInputAddress) => {
  const existingEvents: string[] = [];
  const existingFunctions: string[] = [];

  dataSources
    .filter((d: EthereumDs) => {
      const dsAddress = d.options?.address?.toLowerCase();
      return casedInputAddress ? casedInputAddress === dsAddress : !dsAddress;
    })
    .forEach((ds: EthereumDs) => {
      ds.mapping.handlers.forEach((handler) => {
        if (!handler.filter) return;

        const topics = (handler.filter as EthereumLogFilter).topics?.[0];
        const func = (handler.filter as EthereumTransactionFilter).function;

        if (topics) {
          existingEvents.push(topics);
        }
        if (func) {
          existingFunctions.push(func);
        }
      });
    });

  return {existingEvents, existingFunctions};
};

export const tsExtractor: ManifestExtractor<string> = (dataSources, casedInputAddress) => {
  const existingEvents: string[] = [];
  const existingFunctions: string[] = [];

  splitArrayString(dataSources)
    .filter((d) => {
      const match = d.match(ADDRESS_REG);
      return match && match.length >= 2 && match[1].toLowerCase() === casedInputAddress;
    })
    .forEach((d) => {
      const extractedValue = extractFromTs(d, {handlers: undefined}) as {handlers: string};

      const regResult = extractFromTs(extractedValue.handlers, {
        topics: TOPICS_REG,
        function: FUNCTION_REG,
      });
      if (regResult.topics !== null) {
        existingEvents.push(regResult.topics[0]);
      }
      if (regResult.function !== null) {
        existingFunctions.push(regResult.function as string);
      }
    });

  return {existingEvents, existingFunctions};
};

export async function getManifestData(manifestPath: string): Promise<Document> {
  const existingManifest = await fs.promises.readFile(path.join(manifestPath), 'utf8');
  return parseDocument(existingManifest);
}

export function prependDatasources(dsStr: string, toPendStr: string): string {
  if (dsStr.trim().startsWith('[') && dsStr.trim().endsWith(']')) {
    // Insert the object string right after the opening '['
    return dsStr.trim().replace('[', `[${toPendStr},`);
  } else {
    throw new Error('Input string is not a valid JSON array string');
  }
}
export async function generateManifestTs(
  manifestPath: string,
  userInput: UserInput,
  existingManifestData: string
): Promise<void> {
  const inputDs = constructDatasourcesTs(userInput);

  const extractedDs = extractFromTs(existingManifestData, {dataSources: undefined}) as {dataSources: string};
  const v = prependDatasources(extractedDs.dataSources, inputDs);
  const updateManifest = replaceArrayValueInTsManifest(existingManifestData, 'dataSources', v);

  await fs.promises.writeFile(manifestPath, updateManifest, 'utf8');
}
export async function generateManifestYaml(
  manifestPath: string,
  userInput: UserInput,
  existingManifestData: Document
): Promise<void> {
  const inputDs = constructDatasourcesYaml(userInput);
  const dsNode = existingManifestData.get('dataSources') as YAMLSeq;
  if (!dsNode || !dsNode.items.length) {
    // To ensure output is in yaml format
    const cleanDs = new YAMLSeq();
    cleanDs.add(inputDs);
    existingManifestData.set('dataSources', cleanDs);
  } else {
    dsNode.add(inputDs);
  }
  await fs.promises.writeFile(path.join(manifestPath), existingManifestData.toString(), 'utf8');
}

export function constructHandlerProps(methods: [SelectedMethod[], SelectedMethod[]], abiName: string): AbiPropType {
  const handlers: HandlerPropType[] = [];
  const [events, functions] = methods;

  functions.forEach((fn) => {
    handlers.push({
      name: generateHandlerName(fn.name, abiName, 'tx'),
      argName: 'tx',
      argType: `${upperFirst(fn.name)}Transaction`,
    });
  });

  events.forEach((event) => {
    handlers.push({
      name: generateHandlerName(event.name, abiName, 'log'),
      argName: 'log',
      argType: `${upperFirst(event.name)}Log`,
    });
  });

  return {
    name: abiName,
    handlers: handlers,
  };
}

export async function generateHandlers(
  selectedMethods: [SelectedMethod[], SelectedMethod[]],
  projectPath: string,
  abiName: string
): Promise<void> {
  const abiProps = constructHandlerProps(selectedMethods, abiName);

  const fileName = `${abiName}Handlers`;
  try {
    await renderTemplate(SCAFFOLD_HANDLER_TEMPLATE_PATH, path.join(projectPath, ROOT_MAPPING_DIR, `${fileName}.ts`), {
      props: {
        abis: [abiProps],
      },
      helper: {upperFirst},
    });
    fs.appendFileSync(path.join(projectPath, 'src/index.ts'), `\nexport * from "./mappings/${fileName}"`);
  } catch (e: any) {
    throw new Error(`Unable to generate handler scaffolds. ${e.message}`);
  }
}

export function tsStringify(
  obj: SubqlRuntimeHandler | SubqlRuntimeHandler[] | string,
  indent = 2,
  currentIndent = 0
): string {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string' && obj.includes('EthereumHandlerKind')) {
      return obj; // Return the string as-is without quotes
    }
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const items = obj.map((item) => tsStringify(item, indent, currentIndent + indent));
    return `[\n${items.map((item) => ' '.repeat(currentIndent + indent) + item).join(',\n')}\n${' '.repeat(
      currentIndent
    )}]`;
  }

  const entries = Object.entries(obj);
  const result = entries.map(([key, value]) => {
    const valueStr = tsStringify(value, indent, currentIndent + indent);
    return `${' '.repeat(currentIndent + indent)}${key}: ${valueStr}`;
  });

  return `{\n${result.join(',\n')}\n${' '.repeat(currentIndent)}}`;
}
