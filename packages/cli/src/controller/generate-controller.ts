// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import type {ConstructorFragment, EventFragment, Fragment, FunctionFragment, Interface} from '@ethersproject/abi';
import {keccak256} from '@ethersproject/keccak256';
import {toUtf8Bytes} from '@ethersproject/strings';
import {NETWORK_FAMILY} from '@subql/common';
import type {
  EthereumDatasourceKind,
  EthereumHandlerKind,
  EthereumLogFilter,
  EthereumTransactionFilter,
  SubqlRuntimeDatasource as EthereumDs,
  SubqlRuntimeHandler,
} from '@subql/types-ethereum';
import {difference, pickBy, upperFirst} from 'lodash';
import {Document, parseDocument, YAMLSeq} from 'yaml';
import {Prompt} from '../adapters/utils';
import {ADDRESS_REG, FUNCTION_REG, TOPICS_REG} from '../constants';
import {loadDependency} from '../modulars';
import {
  extractFromTs,
  renderTemplate,
  replaceArrayValueInTsManifest,
  resolveToAbsolutePath,
  splitArrayString,
} from '../utils';

export interface SelectedMethod {
  name: string;
  method: string;
}
export interface UserInput {
  startBlock: number;
  functions: SelectedMethod[];
  events: SelectedMethod[];
  abiPath: string;
  address?: string;
}

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

interface AbiCustomType {
  name: string;
  type: 'enum' | 'struct';
  resolvedType: string;
}

export function extractCustomTypesFromAbi(abiInterface: Interface): Map<string, AbiCustomType> {
  const customTypes = new Map<string, AbiCustomType>();

  try {
    // Process event fragments
    Object.values(abiInterface.events).forEach((eventFragment: EventFragment) => {
      eventFragment.inputs.forEach((input) => {
        extractCustomTypeFromInput(input, customTypes);
      });
    });

    // Process function fragments
    Object.values(abiInterface.functions).forEach((functionFragment: FunctionFragment) => {
      functionFragment.inputs.forEach((input) => {
        extractCustomTypeFromInput(input, customTypes);
      });
    });
  } catch (error) {
    console.warn(
      `Warning: Failed to extract custom types from ABI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return customTypes;
}

function extractCustomTypeFromInput(input: any, customTypes: Map<string, AbiCustomType>): void {
  // Handle tuple types (structs)
  if (input.type === 'tuple' && input.internalType) {
    // Extract struct name from internal type (e.g., "struct MoreData" -> "MoreData", "contract.MoreData" -> "MoreData")
    let structName = input.internalType;
    if (structName.startsWith('struct ')) {
      structName = structName.substring(7); // Remove "struct " prefix
    } else {
      structName = structName.split('.').pop() || structName; // Handle dotted names
    }

    if (!customTypes.has(structName) && input.components) {
      const tupleType = `(${input.components.map((comp: any) => resolveBaseType(comp.type)).join(',')})`;
      customTypes.set(structName, {
        name: structName,
        type: 'struct',
        resolvedType: tupleType,
      });
    }
  }

  // Handle enum types - look for custom internal types that aren't standard solidity types
  if (input.internalType && input.internalType !== input.type) {
    // Extract enum name from internal type (e.g., "enum DisputeType" -> "DisputeType", "contract.DisputeType" -> "DisputeType")
    let enumName = input.internalType;
    if (enumName.startsWith('enum ')) {
      enumName = enumName.substring(5); // Remove "enum " prefix
    } else {
      enumName = enumName.split('.').pop() || enumName; // Handle dotted names
    }

    // Check if it's likely an enum (uint8/uint256 type with custom internal type)
    if (
      (input.type === 'uint8' || input.type === 'uint256') &&
      !enumName.startsWith('struct ') &&
      !isStandardSolidityType(enumName)
    ) {
      if (!customTypes.has(enumName)) {
        customTypes.set(enumName, {
          name: enumName,
          type: 'enum',
          resolvedType: 'uint8', // Standard enum encoding
        });
      }
    }
  }

  // Recursively handle components for nested tuples
  if (input.components) {
    input.components.forEach((comp: any) => {
      extractCustomTypeFromInput(comp, customTypes);
    });
  }
}

function resolveBaseType(type: string): string {
  // Map common type aliases to their canonical forms
  const typeMapping: Record<string, string> = {
    uint: 'uint256',
    int: 'int256',
  };
  return typeMapping[type] || type;
}

function isStandardSolidityType(type: string): boolean {
  const standardTypes = [
    'address',
    'bool',
    'string',
    'bytes',
    // uint variants
    'uint',
    'uint8',
    'uint16',
    'uint24',
    'uint32',
    'uint40',
    'uint48',
    'uint56',
    'uint64',
    'uint72',
    'uint80',
    'uint88',
    'uint96',
    'uint104',
    'uint112',
    'uint120',
    'uint128',
    'uint136',
    'uint144',
    'uint152',
    'uint160',
    'uint168',
    'uint176',
    'uint184',
    'uint192',
    'uint200',
    'uint208',
    'uint216',
    'uint224',
    'uint232',
    'uint240',
    'uint248',
    'uint256',
    // int variants
    'int',
    'int8',
    'int16',
    'int24',
    'int32',
    'int40',
    'int48',
    'int56',
    'int64',
    'int72',
    'int80',
    'int88',
    'int96',
    'int104',
    'int112',
    'int120',
    'int128',
    'int136',
    'int144',
    'int152',
    'int160',
    'int168',
    'int176',
    'int184',
    'int192',
    'int200',
    'int208',
    'int216',
    'int224',
    'int232',
    'int240',
    'int248',
    'int256',
    // bytes variants
    'bytes1',
    'bytes2',
    'bytes3',
    'bytes4',
    'bytes5',
    'bytes6',
    'bytes7',
    'bytes8',
    'bytes9',
    'bytes10',
    'bytes11',
    'bytes12',
    'bytes13',
    'bytes14',
    'bytes15',
    'bytes16',
    'bytes17',
    'bytes18',
    'bytes19',
    'bytes20',
    'bytes21',
    'bytes22',
    'bytes23',
    'bytes24',
    'bytes25',
    'bytes26',
    'bytes27',
    'bytes28',
    'bytes29',
    'bytes30',
    'bytes31',
    'bytes32',
  ];

  // Also handle array types
  const baseType = type.replace(/\[\d*\]$/, '');
  return standardTypes.includes(baseType);
}

export function resolveCustomTypesInSignature(signature: string, customTypes: Map<string, AbiCustomType>): string {
  let resolvedSignature = signature;
  const unresolvedTypes: string[] = [];

  // Replace custom types in the signature
  customTypes.forEach((customType, typeName) => {
    // Create regex to match the custom type name as a parameter type
    // This handles both "TypeName param" and "TypeName indexed param" patterns
    const regex = new RegExp(`\\b${escapeRegex(typeName)}\\b`, 'g');
    const hasMatch = regex.test(resolvedSignature);

    if (hasMatch) {
      resolvedSignature = resolvedSignature.replace(
        new RegExp(`\\b${escapeRegex(typeName)}\\b`, 'g'),
        customType.resolvedType
      );
    }
  });

  // Check for any remaining unresolved custom types
  const possibleCustomTypes = signature.match(/\b[A-Z][a-zA-Z0-9_]*\b/g) || [];
  possibleCustomTypes.forEach((type) => {
    if (!isStandardSolidityType(type) && !customTypes.has(type) && type !== 'indexed') {
      // Check if this type appears in a type position (not as a parameter name)
      const typeInPosition = new RegExp(`\\b${escapeRegex(type)}\\s+(?:indexed\\s+)?[a-z]`, 'i').test(signature);
      if (typeInPosition) {
        unresolvedTypes.push(type);
      }
    }
  });

  if (unresolvedTypes.length > 0) {
    console.warn(
      `Warning: Found unresolved custom types in signature '${signature}': ${unresolvedTypes.join(', ')}. These types may need to be defined in the ABI or manually resolved.`
    );
  }

  return resolvedSignature;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateTopic0Hash(eventSignature: string): string {
  // Remove any indexed keywords and extra whitespace for canonical form
  const canonicalSignature = eventSignature
    .replace(/\s+indexed\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Generate keccak256 hash
  return keccak256(toUtf8Bytes(canonicalSignature));
}

/**
 * Copies the provided ABI file to the default ABI directory in the project root.
 */
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
    await fs.promises.copyFile(ensuredAbiPath, path.join(abiDirPath, path.basename(ensuredAbiPath)));
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      throw new Error(`Unable to find abi at: ${abiPath}`);
    }
    throw new Error(`Unable to copy abi file: ${e.message}`);
  }
}

/**
 * Saves the provided ABI to a file in the default ABI directory.
 * @param abi - The ABI to save.
 * @param addressOrName - The name or address to use as the filename.
 * @param rootPath - The root path of the project.
 * @returns The path to the saved ABI file.
 */
export async function saveAbiToFile(abi: unknown, addressOrName: string, rootPath: string): Promise<string> {
  const abiDirPath = path.join(rootPath, DEFAULT_ABI_DIR);
  const filePath = path.join(abiDirPath, `${addressOrName}.abi.json`);

  await fs.promises.writeFile(filePath, JSON.stringify(abi, null, 2));

  return filePath;
}

export function prepareUserInput<T>(
  selectedEvents: Record<string, EventFragment>,
  selectedFunctions: Record<string, FunctionFragment>,
  existingDs: T,
  address: string | undefined,
  startBlock: number,
  abiFileName: string,
  extractor: ManifestExtractor<T>
): UserInput {
  const [cleanEvents, cleanFunctions] = filterExistingMethods(
    selectedEvents,
    selectedFunctions,
    existingDs,
    address,
    extractor
  );

  const constructedEvents = constructMethod<EventFragment>(cleanEvents);
  const constructedFunctions = constructMethod<FunctionFragment>(cleanFunctions);

  return {
    startBlock: startBlock,
    functions: constructedFunctions,
    events: constructedEvents,
    abiPath: `./abis/${abiFileName}`,
    address: address,
  };
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
  kindModifier: (kind: string) => EthereumHandlerKind | string,
  abiInterface?: Interface
): SubqlRuntimeHandler[] {
  const formattedHandlers: SubqlRuntimeHandler[] = [];

  // Extract custom types from ABI if available
  const customTypes = abiInterface ? extractCustomTypesFromAbi(abiInterface) : new Map<string, AbiCustomType>();

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
    let eventTopic = event.method;

    // Only apply custom type resolution and hashing if we have custom types
    if (customTypes.size > 0) {
      const resolvedSignature = resolveCustomTypesInSignature(event.method, customTypes);
      // Only hash if the signature was actually changed (contains custom types)
      if (resolvedSignature !== event.method) {
        eventTopic = generateTopic0Hash(resolvedSignature);
      }
    }

    const handler: SubqlRuntimeHandler = {
      handler: generateHandlerName(event.name, abiName, 'log'),
      kind: kindModifier('EthereumHandlerKind.Event') as any, // Should be union type
      filter: {
        topics: [eventTopic],
      },
    };
    formattedHandlers.push(handler);
  });

  return formattedHandlers;
}

export function constructDatasourcesTs(userInput: UserInput, projectPath: string): string {
  const ethModule = loadDependency(NETWORK_FAMILY.ethereum, projectPath);
  const abiName = ethModule.parseContractPath(userInput.abiPath).name;

  // Try to load ABI interface for custom type resolution, but don't fail if not available
  let abiInterface: Interface | undefined;
  try {
    abiInterface = ethModule.getAbiInterface(projectPath, abiName);
  } catch (error) {
    // ABI file may not exist in test scenarios, continue without custom type resolution
    console.warn(`Warning: Could not load ABI interface for ${abiName}, custom type resolution disabled`);
  }

  const formattedHandlers = generateFormattedHandlers(userInput, abiName, (kind) => kind, abiInterface);
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

export function constructDatasourcesYaml(userInput: UserInput, projectPath: string): EthereumDs {
  const ethModule = loadDependency(NETWORK_FAMILY.ethereum, projectPath);
  const abiName = ethModule.parseContractPath(userInput.abiPath).name;

  // Try to load ABI interface for custom type resolution, but don't fail if not available
  let abiInterface: Interface | undefined;
  try {
    abiInterface = ethModule.getAbiInterface(projectPath, abiName);
  } catch (error) {
    // ABI file may not exist in test scenarios, continue without custom type resolution
    console.warn(`Warning: Could not load ABI interface for ${abiName}, custom type resolution disabled`);
  }

  const formattedHandlers = generateFormattedHandlers(
    userInput,
    abiName,
    (kind) => {
      if (kind === 'EthereumHandlerKind.Call') return 'ethereum/TransactionHandler' as EthereumHandlerKind.Call;
      return 'ethereum/LogHandler' as EthereumHandlerKind.Event;
    },
    abiInterface
  );
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
  abiName: string,
  prompt: Prompt | null
): Promise<Record<string, T>> {
  if (!rawInput) {
    if (!prompt) {
      // No items selected or
      return {};
    }

    const selected = await prompt({
      message: `Select ${type}`,
      type: 'string',
      options: Object.keys(availableFragments),
      multiple: true,
    });

    return Object.entries(availableFragments)
      .filter(([key]) => selected.includes(key))
      .reduce(
        (acc, [key, value]) => {
          acc[key as string] = value;
          return acc;
        },
        {} as Record<string, T>
      );
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
      throw new Error(`'${input}' is not a valid ${type} on ${abiName}`);
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
  const inputDs = constructDatasourcesTs(userInput, manifestPath);

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
  const inputDs = constructDatasourcesYaml(userInput, manifestPath);
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
