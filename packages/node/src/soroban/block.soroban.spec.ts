// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SorobanBlock,
  SorobanBlockFilter,
  SorobanEffect,
  SorobanEffectFilter,
  SorobanEvent,
  SorobanEventFilter,
  SorobanOperation,
  SorobanOperationFilter,
  SorobanTransaction,
  SorobanTransactionFilter,
} from '@subql/types-soroban';
import { Horizon, ServerApi } from 'stellar-sdk';
import { SorobanBlockWrapped } from './block.soroban';

describe('SorobanBlockWrapped', () => {
  describe('filterBlocksProcessor', () => {
    it('should filter by modulo', () => {
      const block: SorobanBlock = { sequence: 5 } as unknown as SorobanBlock;
      const filter: SorobanBlockFilter = { modulo: 2 };

      const result = SorobanBlockWrapped.filterBlocksProcessor(block, filter);

      expect(result).toBe(false);
    });
  });

  describe('filterTransactionProcessor', () => {
    it('should filter by account', () => {
      const transaction: SorobanTransaction = {
        source_account: 'account1',
      } as unknown as SorobanTransaction;
      const filter: SorobanTransactionFilter = { account: 'account2' };

      const result = SorobanBlockWrapped.filterTransactionProcessor(
        transaction,
        filter,
      );

      expect(result).toBe(false);
    });

    it('should pass when account filter condition is fulfilled', () => {
      const transaction: SorobanTransaction = {
        source_account: 'account1',
      } as unknown as SorobanTransaction;
      const filter: SorobanTransactionFilter = { account: 'account1' };

      const result = SorobanBlockWrapped.filterTransactionProcessor(
        transaction,
        filter,
      );

      expect(result).toBe(true);
    });

    it('should pass when there is no account filter', () => {
      const transaction: SorobanTransaction = {
        source_account: 'account1',
      } as unknown as SorobanTransaction;
      const filter: SorobanTransactionFilter = {};

      const result = SorobanBlockWrapped.filterTransactionProcessor(
        transaction,
        filter,
      );

      expect(result).toBe(true);
    });
  });

  describe('filterOperationProcessor', () => {
    it('should filter by source_account and type', () => {
      const operation: SorobanOperation = {
        source_account: 'account1',
        type: 'type1',
      } as unknown as SorobanOperation;
      const filter: SorobanOperationFilter = {
        source_account: 'account2',
        type: Horizon.OperationResponseType.createAccount,
      };

      const result = SorobanBlockWrapped.filterOperationProcessor(
        operation,
        filter,
      );

      expect(result).toBe(false);
    });

    it('should pass when source_account and type filter conditions are fulfilled', () => {
      const operation: SorobanOperation = {
        source_account: 'account1',
        type: Horizon.OperationResponseType.createAccount,
      } as unknown as SorobanOperation;
      const filter: SorobanOperationFilter = {
        source_account: 'account1',
        type: Horizon.OperationResponseType.createAccount,
      };

      const result = SorobanBlockWrapped.filterOperationProcessor(
        operation,
        filter,
      );

      expect(result).toBe(true);
    });

    it('should pass when there are no filter conditions', () => {
      const operation: SorobanOperation = {
        source_account: 'account1',
        type: 'type1',
      } as unknown as SorobanOperation;
      const filter: SorobanOperationFilter = {};

      const result = SorobanBlockWrapped.filterOperationProcessor(
        operation,
        filter,
      );

      expect(result).toBe(true);
    });
  });

  describe('filterEffectProcessor', () => {
    it('should filter by account and type', () => {
      const effect: SorobanEffect = {
        account: 'account1',
        type: 'type1',
      } as unknown as SorobanEffect;
      const filter: SorobanEffectFilter = {
        account: 'account2',
        type: 'type2',
      };

      const result = SorobanBlockWrapped.filterEffectProcessor(effect, filter);

      expect(result).toBe(false);
    });

    it('should pass when account and type filter conditions are fulfilled', () => {
      const effect: SorobanEffect = {
        account: 'account1',
        type: 'type1',
      } as unknown as SorobanEffect;
      const filter: SorobanEffectFilter = {
        account: 'account1',
        type: 'type1',
      };

      const result = SorobanBlockWrapped.filterEffectProcessor(effect, filter);

      expect(result).toBe(true);
    });

    it('should pass when there are no filter conditions', () => {
      const effect: SorobanEffect = {
        account: 'account1',
        type: 'type1',
      } as unknown as SorobanEffect;
      const filter: SorobanEffectFilter = {};

      const result = SorobanBlockWrapped.filterEffectProcessor(effect, filter);

      expect(result).toBe(true);
    });
  });
});
