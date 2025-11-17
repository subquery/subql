// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { id } from '@ethersproject/hash';
import * as hashModule from '@ethersproject/hash';
import { eventToTopic, functionToSighash } from './string';

describe('String utilities', () => {
  describe('eventToTopic', () => {
    it('should return hex string as-is', () => {
      const hexInput =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(eventToTopic(hexInput)).toBe(hexInput);
    });

    it('should generate topic hash for standard event signature', () => {
      const signature = 'Transfer(address,address,uint256)';
      const expected = id(signature);
      expect(eventToTopic(signature)).toBe(expected);
    });

    it('should generate topic hash for standard event signature with indexed', () => {
      const signature = 'Transfer(indexed address, indexed address,uint256)';
      const expected = id('Transfer(address,address,uint256)');
      expect(eventToTopic(signature)).toBe(expected);
    });

    it('should generate topic hash for resolved signatures (enum as uint8)', () => {
      // After project load-time resolution, enum types are already resolved to uint8
      const resolvedSignature = 'DisputeOpen(uint256,address,address,uint8)';
      const expected = id(resolvedSignature);
      expect(eventToTopic(resolvedSignature)).toBe(expected);
    });

    it('should generate topic hash for resolved signatures (struct as tuple)', () => {
      // After project load-time resolution, struct types are already resolved to tuples
      const resolvedSignature = 'DataUpdated(address,(bytes32,bytes32))';
      const expected = id(resolvedSignature);
      expect(eventToTopic(resolvedSignature)).toBe(expected);
    });

    it('should cache results', () => {
      // Use a unique signature to avoid cache pollution from other tests
      const signature = 'UniqueTestEvent(bytes32,uint256,address)';
      const idSpy = jest.spyOn(hashModule, 'id');

      const firstResult = eventToTopic(signature);
      const callCountAfterFirst = idSpy.mock.calls.length;

      const secondResult = eventToTopic(signature);
      const callCountAfterSecond = idSpy.mock.calls.length;

      // Second call should not invoke id() again due to caching
      expect(callCountAfterSecond).toBe(callCountAfterFirst);
      expect(firstResult).toBe(secondResult);

      idSpy.mockRestore();
    });
  });

  describe('functionToSighash', () => {
    it('should return hex string as-is', () => {
      const hexInput = '0x12345678';
      expect(functionToSighash(hexInput)).toBe(hexInput);
    });

    it('should generate function sighash for standard function signature', () => {
      const signature = 'transfer(address,uint256)';
      const expected = '0xa9059cbb'; // Known sighash for transfer function
      expect(functionToSighash(signature)).toBe(expected);
    });

    it('should cache results', () => {
      // Use a unique signature to avoid cache pollution from other tests
      const signature = 'uniqueTestFunction(bytes32,uint256)';
      const idSpy = jest.spyOn(hashModule, 'id');

      const firstResult = functionToSighash(signature);
      const callCountAfterFirst = idSpy.mock.calls.length;

      const secondResult = functionToSighash(signature);
      const callCountAfterSecond = idSpy.mock.calls.length;

      // Second call should not invoke id() again due to caching
      expect(callCountAfterSecond).toBe(callCountAfterFirst);
      expect(firstResult).toBe(secondResult);

      idSpy.mockRestore();
    });
  });
});
