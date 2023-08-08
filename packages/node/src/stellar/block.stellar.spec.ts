// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  StellarBlock,
  StellarBlockFilter,
  StellarEffect,
  StellarEffectFilter,
  StellarEvent,
  StellarEventFilter,
  StellarOperation,
  StellarOperationFilter,
  StellarTransaction,
  StellarTransactionFilter,
} from '@subql/types-stellar';
import { Horizon, ServerApi } from 'stellar-sdk';
import { StellarBlockWrapped } from './block.stellar';

describe('StellarBlockWrapped', () => {
  describe('filterBlocksProcessor', () => {
    it('should filter by modulo', () => {
      const block: StellarBlock = { sequence: 5 } as unknown as StellarBlock;
      const filter: StellarBlockFilter = { modulo: 2 };

      const result = StellarBlockWrapped.filterBlocksProcessor(block, filter);

      expect(result).toBe(false);
    });
  });

  describe('filterTransactionProcessor', () => {
    it('should filter by account', () => {
      const transaction: StellarTransaction = {
        source_account: 'account1',
      } as unknown as StellarTransaction;
      const filter: StellarTransactionFilter = { account: 'account2' };

      const result = StellarBlockWrapped.filterTransactionProcessor(
        transaction,
        filter,
      );

      expect(result).toBe(false);
    });

    it('should pass when account filter condition is fulfilled', () => {
      const transaction: StellarTransaction = {
        source_account: 'account1',
      } as unknown as StellarTransaction;
      const filter: StellarTransactionFilter = { account: 'account1' };

      const result = StellarBlockWrapped.filterTransactionProcessor(
        transaction,
        filter,
      );

      expect(result).toBe(true);
    });

    it('should pass when there is no account filter', () => {
      const transaction: StellarTransaction = {
        source_account: 'account1',
      } as unknown as StellarTransaction;
      const filter: StellarTransactionFilter = {};

      const result = StellarBlockWrapped.filterTransactionProcessor(
        transaction,
        filter,
      );

      expect(result).toBe(true);
    });
  });

  describe('filterOperationProcessor', () => {
    it('should filter by source_account and type', () => {
      const operation: StellarOperation = {
        source_account: 'account1',
        type: 'type1',
      } as unknown as StellarOperation;
      const filter: StellarOperationFilter = {
        source_account: 'account2',
        type: Horizon.OperationResponseType.createAccount,
      };

      const result = StellarBlockWrapped.filterOperationProcessor(
        operation,
        filter,
      );

      expect(result).toBe(false);
    });

    it('should pass when source_account and type filter conditions are fulfilled', () => {
      const operation: StellarOperation = {
        source_account: 'account1',
        type: Horizon.OperationResponseType.createAccount,
      } as unknown as StellarOperation;
      const filter: StellarOperationFilter = {
        source_account: 'account1',
        type: Horizon.OperationResponseType.createAccount,
      };

      const result = StellarBlockWrapped.filterOperationProcessor(
        operation,
        filter,
      );

      expect(result).toBe(true);
    });

    it('should pass when there are no filter conditions', () => {
      const operation: StellarOperation = {
        source_account: 'account1',
        type: 'type1',
      } as unknown as StellarOperation;
      const filter: StellarOperationFilter = {};

      const result = StellarBlockWrapped.filterOperationProcessor(
        operation,
        filter,
      );

      expect(result).toBe(true);
    });
  });

  describe('filterEffectProcessor', () => {
    it('should filter by account and type', () => {
      const effect: StellarEffect = {
        account: 'account1',
        type: 'type1',
      } as unknown as StellarEffect;
      const filter: StellarEffectFilter = {
        account: 'account2',
        type: 'type2',
      };

      const result = StellarBlockWrapped.filterEffectProcessor(effect, filter);

      expect(result).toBe(false);
    });

    it('should pass when account and type filter conditions are fulfilled', () => {
      const effect: StellarEffect = {
        account: 'account1',
        type: 'type1',
      } as unknown as StellarEffect;
      const filter: StellarEffectFilter = {
        account: 'account1',
        type: 'type1',
      };

      const result = StellarBlockWrapped.filterEffectProcessor(effect, filter);

      expect(result).toBe(true);
    });

    it('should pass when there are no filter conditions', () => {
      const effect: StellarEffect = {
        account: 'account1',
        type: 'type1',
      } as unknown as StellarEffect;
      const filter: StellarEffectFilter = {};

      const result = StellarBlockWrapped.filterEffectProcessor(effect, filter);

      expect(result).toBe(true);
    });
  });
});
