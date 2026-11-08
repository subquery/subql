// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Fragment, EventFragment, Interface} from '@ethersproject/abi';
import {keccak256} from '@ethersproject/keccak256';
import {toUtf8Bytes} from '@ethersproject/strings';

export interface TypeResolutionResult {
  canonicalSignature: string;
  keccak256Hash: string;
  resolvedTypes: Map<string, string>;
}

export interface StructDefinition {
  name: string;
  components: Array<{
    name: string;
    type: string;
    components?: any[];
  }>;
}

export class EthereumTypeResolver {
  private structDefinitions: Map<string, StructDefinition> = new Map();
  private enumDefinitions: Map<string, string[]> = new Map();
  private typeCache: Map<string, string> = new Map();

  constructor(private abiInterface: Interface) {
    this.analyzeAbiForCustomTypes();
  }

  private analyzeAbiForCustomTypes(): void {
    this.abiInterface.fragments.forEach((fragment) => {
      if (fragment.type === 'event' || fragment.type === 'function') {
        const inputs = (fragment as any).inputs || [];
        this.extractCustomTypesFromInputs(inputs);
      }
    });
  }

  private extractCustomTypesFromInputs(inputs: any[]): void {
    inputs.forEach((input) => {
      if (input.type.startsWith('tuple')) {
        this.analyzeStructType(input);
      }

      if (input.type === 'uint8' && this.looksLikeEnum(input)) {
        this.analyzeEnumType(input);
      }

      if (input.components) {
        this.extractCustomTypesFromInputs(input.components);
      }
    });
  }

  private analyzeStructType(input: any): void {
    if (input.components) {
      const structName = this.inferStructName(input);
      if (structName && !this.structDefinitions.has(structName)) {
        this.registerStructFromComponents(structName, input.components);
      }
    }
  }

  private registerStructFromComponents(structName: string, components: any[]): void {
    this.structDefinitions.set(structName, {
      name: structName,
      components: components,
    });
  }

  private looksLikeEnum(input: any): boolean {
    const enumPatterns = [/Type$/, /Status$/, /Kind$/, /State$/, /Mode$/, /Flag$/];
    return enumPatterns.some((pattern) => pattern.test(input.name));
  }

  private analyzeEnumType(input: any): void {
    const enumName = input.name;
    if (!this.enumDefinitions.has(enumName)) {
      this.enumDefinitions.set(enumName, []);
    }
  }

  /**
   * Resolve custom types in event signature to basic Solidity types
   */
  resolveEventSignature(eventSignature: string): TypeResolutionResult {
    const fragment = this.parseEventSignature(eventSignature);
    const resolvedInputs = this.resolveInputTypes(fragment.inputs);
    const canonicalSignature = this.buildCanonicalSignature(fragment.name, resolvedInputs);
    const keccak256Hash = keccak256(toUtf8Bytes(canonicalSignature));

    return {
      canonicalSignature,
      keccak256Hash,
      resolvedTypes: this.getResolvedTypeMap(fragment.inputs, resolvedInputs),
    };
  }

  private parseEventSignature(eventSignature: string): EventFragment {
    try {
      const cleanSignature = eventSignature.replace(/^event\s+/, '');
      return EventFragment.from(`event ${cleanSignature}`);
    } catch (error) {
      throw new Error(`Invalid event signature format: ${eventSignature}\n${(error as Error).message}`);
    }
  }

  private resolveInputTypes(inputs: any[]): string[] {
    return inputs.map((input) => this.resolveType(input.type, input.name));
  }

  private buildCanonicalSignature(eventName: string, resolvedInputs: string[]): string {
    return `${eventName}(${resolvedInputs.join(',')})`;
  }

  private getResolvedTypeMap(originalInputs: any[], resolvedTypes: string[]): Map<string, string> {
    const typeMap = new Map<string, string>();

    originalInputs.forEach((input, index) => {
      if (input.type !== resolvedTypes[index]) {
        typeMap.set(input.type, resolvedTypes[index]);
      }
    });

    return typeMap;
  }

  private resolveType(type: string, paramName?: string): string {
    const cacheKey = `${type}:${paramName || ''}`;
    const cacheValue = this.typeCache.get(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const resolvedType = this.doResolveType(type, paramName);
    this.typeCache.set(cacheKey, resolvedType);
    return resolvedType;
  }

  private doResolveType(type: string, paramName?: string): string {
    // Handle arrays first
    if (type.endsWith('[]')) {
      const baseType = type.slice(0, -2);
      return `${this.resolveType(baseType, paramName)}[]`;
    }

    const arrayMatch = type.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const baseType = arrayMatch[1];
      const size = arrayMatch[2];
      return `${this.resolveType(baseType, paramName)}[${size}]`;
    }

    if (this.isBasicSolidityType(type)) {
      return type;
    }

    if (type.startsWith('tuple(')) {
      return this.resolveTupleType(type);
    }

    return this.resolveCustomType(type, paramName);
  }

  private resolveTupleType(tupleType: string): string {
    const componentsMatch = tupleType.match(/^tuple\((.+)\)$/);
    if (!componentsMatch) {
      return tupleType;
    }

    const components = this.parseCommaSeperatedTypes(componentsMatch[1]);
    const resolvedComponents = components.map((comp) => this.resolveType(comp));
    return `tuple(${resolvedComponents.join(',')})`;
  }

  private parseCommaSeperatedTypes(typesString: string): string[] {
    const types: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < typesString.length; i++) {
      const char = typesString[i];

      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      } else if (char === ',' && depth === 0) {
        types.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      types.push(current.trim());
    }

    return types;
  }

  private resolveCustomType(typeName: string, paramName?: string): string {
    if (this.isLikelyEnum(typeName, paramName)) {
      return 'uint8';
    }

    const structInfo = this.structDefinitions.get(typeName);
    if (structInfo) {
      const tupleTypes = structInfo.components.map((comp) => this.resolveType(comp.type, comp.name));
      return `tuple(${tupleTypes.join(',')})`;
    }

    const inferredType = this.inferTypeFromAbi(typeName, paramName);
    if (inferredType) {
      return inferredType;
    }

    throw new Error(
      `Unknown custom type: ${typeName}${paramName ? ` (parameter: ${paramName})` : ''}. ` +
        `Please ensure the type is defined in the ABI or use a basic Solidity type. ` +
        `Available struct types: [${Array.from(this.structDefinitions.keys()).join(', ')}]`
    );
  }

  private isBasicSolidityType(type: string): boolean {
    const basicTypePatterns = [
      /^uint(\d+)?$/,
      /^int(\d+)?$/,
      /^bytes(\d+)?$/,
      /^bool$/,
      /^address$/,
      /^string$/,
      /^bytes$/,
    ];
    return basicTypePatterns.some((pattern) => pattern.test(type));
  }

  private isLikelyEnum(typeName: string, paramName?: string): boolean {
    const enumSuffixes = [/Type$/, /Status$/, /Kind$/, /State$/, /Mode$/, /Flag$/];

    const typeMatches = enumSuffixes.some((pattern) => pattern.test(typeName));
    const paramMatches = paramName ? enumSuffixes.some((pattern) => pattern.test(paramName)) : false;

    return typeMatches || paramMatches;
  }

  private inferTypeFromAbi(typeName: string, paramName?: string): string | null {
    for (const fragment of this.abiInterface.fragments) {
      if (fragment.type === 'event' || fragment.type === 'function') {
        const inputs = (fragment as any).inputs || [];

        for (const input of inputs) {
          if (input.type.includes(typeName) || input.name === typeName) {
            if (input.type.startsWith('tuple') && input.components) {
              this.registerStructFromComponents(typeName, input.components);
              const tupleTypes = input.components.map((comp: any) => this.resolveType(comp.type, comp.name));
              return `tuple(${tupleTypes.join(',')})`;
            }
          }
        }
      }
    }

    return null;
  }

  private inferStructName(input: any): string {
    if (input.name && this.looksLikeTypeName(input.name)) {
      return this.capitalizeFirstLetter(input.name);
    }

    if (input.internalType && input.internalType.includes('struct')) {
      const match = input.internalType.match(/struct\s+(\w+)/);
      if (match) {
        return match[1];
      }
    }

    return `CustomStruct_${input.components.length}Fields`;
  }

  private looksLikeTypeName(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get debug information about discovered types
   */
  getDiscoveredTypes(): {
    structs: string[];
    enums: string[];
    typeCache: Record<string, string>;
  } {
    return {
      structs: Array.from(this.structDefinitions.keys()),
      enums: Array.from(this.enumDefinitions.keys()),
      typeCache: Object.fromEntries(this.typeCache.entries()),
    };
  }
}
