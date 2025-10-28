// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { resolveCustomTypesInSignature, AbiCustomType } from './string';

describe('Project utilities - Custom Type Resolution', () => {
  // Create mock custom types map (as would be extracted from ABI)
  const mockCustomTypes = new Map<string, AbiCustomType>([
    [
      'DisputeType',
      { name: 'DisputeType', type: 'enum', resolvedType: 'uint8' },
    ],
    [
      'MoreData',
      { name: 'MoreData', type: 'struct', resolvedType: '(bytes32,bytes32)' },
    ],
    ['Status', { name: 'Status', type: 'enum', resolvedType: 'uint8' }],
    [
      'NestedData',
      { name: 'NestedData', type: 'struct', resolvedType: '(uint256,bool)' },
    ],
  ]);

  describe('resolveCustomTypesInSignature', () => {
    const customTypes = mockCustomTypes;

    it('should resolve enum types to uint8 in signature', () => {
      const signature = 'DisputeOpen(uint256,address,address,DisputeType)';
      const resolved = resolveCustomTypesInSignature(signature, customTypes);

      expect(resolved).toBe('DisputeOpen(uint256,address,address,uint8)');
    });

    it('should resolve struct types to tuple format in signature', () => {
      const signature = 'DataUpdated(address,MoreData)';
      const resolved = resolveCustomTypesInSignature(signature, customTypes);

      expect(resolved).toBe('DataUpdated(address,(bytes32,bytes32))');
    });

    it('should handle dotted namespace custom types in signature', () => {
      // When custom types are defined with namespaces in the ABI (e.g., "enum MyContract.Status")
      // they are extracted with just the type name ("Status")
      // But signatures may reference them with full namespace
      const signature = 'ComplexEvent(Status,NestedData)';
      const resolved = resolveCustomTypesInSignature(signature, customTypes);

      expect(resolved).toBe('ComplexEvent(uint8,(uint256,bool))');
    });

    it('should handle fully qualified names when custom types are extracted with namespace', () => {
      // Create custom types map with namespace-aware entries
      const namespacedTypes = new Map<string, AbiCustomType>([
        [
          'MyContract.Status',
          { name: 'MyContract.Status', type: 'enum', resolvedType: 'uint8' },
        ],
        [
          'MyContract.NestedData',
          {
            name: 'MyContract.NestedData',
            type: 'struct',
            resolvedType: '(uint256,bool)',
          },
        ],
      ]);

      const signature = 'ComplexEvent(MyContract.Status,MyContract.NestedData)';
      const resolved = resolveCustomTypesInSignature(
        signature,
        namespacedTypes,
      );

      expect(resolved).toBe('ComplexEvent(uint8,(uint256,bool))');
    });

    it('should handle realistic manifest signatures with indexed parameters', () => {
      const signature =
        'DisputeOpen(uint256 indexed disputeId, address fisherman, address runner, DisputeType _type)';
      const resolved = resolveCustomTypesInSignature(signature, customTypes);

      // Should resolve DisputeType to uint8, preserving the rest of the signature
      expect(resolved).toBe(
        'DisputeOpen(uint256 indexed disputeId, address fisherman, address runner, uint8 _type)',
      );
    });

    it('should not modify signatures without custom types', () => {
      const signature = 'Transfer(address,address,uint256)';
      const resolved = resolveCustomTypesInSignature(signature, customTypes);

      expect(resolved).toBe(signature);
    });

    it('should handle multiple custom types in one signature', () => {
      const signature = 'MultiEvent(DisputeType,MoreData,Status)';
      const resolved = resolveCustomTypesInSignature(signature, customTypes);

      expect(resolved).toBe('MultiEvent(uint8,(bytes32,bytes32),uint8)');
    });

    it('should be case-sensitive for custom type names', () => {
      const signature = 'Event(disputetype,moredata)'; // lowercase
      const resolved = resolveCustomTypesInSignature(signature, customTypes);

      expect(resolved).toBe(signature);
    });

    it('should only replace whole word matches', () => {
      const signature = 'Event(DisputeTypeExtended,MoreDataPlus)';
      const resolved = resolveCustomTypesInSignature(signature, customTypes);

      expect(resolved).toBe(signature);
    });
  });

  describe('Integration: Project load-time resolution flow', () => {
    it('should demonstrate the full resolution flow', () => {
      const customTypes = mockCustomTypes;

      const originalFilter =
        'DisputeOpen(uint256 indexed disputeId, address fisherman, address runner, DisputeType _type)';

      const resolvedFilter = resolveCustomTypesInSignature(
        originalFilter,
        customTypes,
      );

      expect(resolvedFilter).toBe(
        'DisputeOpen(uint256 indexed disputeId, address fisherman, address runner, uint8 _type)',
      );
    });
  });
});
