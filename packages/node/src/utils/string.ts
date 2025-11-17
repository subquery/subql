// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventFragment, FunctionFragment, Interface } from '@ethersproject/abi';
import { isHexString, hexStripZeros, hexDataSlice } from '@ethersproject/bytes';
import { id } from '@ethersproject/hash';

export function stringNormalizedEq(a: string, b?: string): boolean {
  return a.toLowerCase() === b?.toLowerCase();
}

export function hexStringEq(a: string, b: string): boolean {
  if (!isHexString(a) || !isHexString(b)) {
    throw new Error('Inputs are not hex strings');
  }
  return stringNormalizedEq(hexStripZeros(a), hexStripZeros(b));
}

const eventTopicsCache: Record<string, string> = {};
const functionSighashCache: Record<string, string> = {};

export interface AbiCustomType {
  name: string;
  type: 'enum' | 'struct';
  resolvedType: string;
}

export function extractCustomTypesFromAbi(
  abiInterface: Interface,
): Map<string, AbiCustomType> {
  const customTypes = new Map<string, AbiCustomType>();

  try {
    // Process event fragments
    Object.values(abiInterface.events).forEach(
      (eventFragment: EventFragment) => {
        eventFragment.inputs.forEach((input) => {
          extractCustomTypeFromInput(input, customTypes);
        });
      },
    );

    // Process function fragments
    Object.values(abiInterface.functions).forEach(
      (functionFragment: FunctionFragment) => {
        functionFragment.inputs.forEach((input) => {
          extractCustomTypeFromInput(input, customTypes);
        });
      },
    );
  } catch (error) {
    // Silently handle extraction errors in runtime
  }

  return customTypes;
}

function extractCustomTypeFromInput(
  input: { type: string; internalType?: string; components?: any[] },
  customTypes: Map<string, AbiCustomType>,
): void {
  // Handle tuple types (structs)
  if (input.type === 'tuple' && input.internalType) {
    // Extract struct name from internal type (e.g., "struct MoreData" -> "MoreData", "contract.MoreData" -> "MoreData")
    const structName = input.internalType
      .replace(/^struct\s+/, '') // Remove "struct " prefix
      .replace(/^.*\./, ''); // Remove contract prefix if present (e.g., "contract.Name" -> "Name")

    if (!customTypes.has(structName) && input.components) {
      const tupleType = `(${input.components
        .map((comp: any) => resolveBaseType(comp.type))
        .join(',')})`;
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
    const enumName = input.internalType
      .replace(/^enum\s+/, '') // Remove "enum " prefix
      .replace(/^.*\./, ''); // Remove contract prefix if present (e.g., "contract.Name" -> "Name")

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
          resolvedType: 'uint8',
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

  // handle array types
  const baseType = type.replace(/\[\d*\]$/, '');
  return standardTypes.includes(baseType);
}

export function resolveCustomTypesInSignature(
  signature: string,
  customTypes: Map<string, AbiCustomType>,
): string {
  let resolvedSignature = signature;

  // Replace custom types in the signature
  customTypes.forEach((customType, typeName) => {
    // Create regex to match the custom type name as a parameter type
    const regex = new RegExp(`\\b${escapeRegex(typeName)}\\b`, 'g');
    resolvedSignature = resolvedSignature.replace(
      regex,
      customType.resolvedType,
    );
  });

  return resolvedSignature;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function eventToTopic(input: string): string {
  if (isHexString(input)) return input;

  if (!eventTopicsCache[input]) {
    const cleanedInput = input.replace(/\bindexed\b/g, '');
    eventTopicsCache[input] = id(
      EventFragment.fromString(cleanedInput).format(),
    );
  }

  return eventTopicsCache[input];
}

export function functionToSighash(input: string): string {
  if (isHexString(input)) return input;

  if (!functionSighashCache[input]) {
    functionSighashCache[input] = hexDataSlice(
      id(FunctionFragment.fromString(input).format()),
      0,
      4,
    );
  }

  return functionSighashCache[input];
}
