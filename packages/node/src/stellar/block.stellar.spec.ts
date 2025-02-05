// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { nativeToScVal, Contract, xdr, Horizon } from '@stellar/stellar-sdk';
import {
  StellarBlock,
  StellarBlockFilter,
  StellarEffect,
  StellarEffectFilter,
  SorobanEvent,
  SorobanEventFilter,
  StellarOperation,
  StellarOperationFilter,
  StellarTransaction,
  StellarTransactionFilter,
} from '@subql/types-stellar';
import { StellarBlockWrapped } from './block.stellar';

const testAddress = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
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
        sourceAccount: 'account2',
        type: 'create_account' as Horizon.HorizonApi.OperationResponseType,
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
        type: Horizon.HorizonApi.OperationResponseType.createAccount,
      } as unknown as StellarOperation;
      const filter: StellarOperationFilter = {
        sourceAccount: 'account1',
        type: Horizon.HorizonApi.OperationResponseType.createAccount,
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

  describe('StellarBlockWrapped', function () {
    const topic1 = nativeToScVal('topic1');
    const topic2 = nativeToScVal('topic2');

    const mockEvent: SorobanEvent = {
      txHash: '',
      type: 'contract',
      ledger: null,
      transaction: null,
      operation: null,
      ledgerClosedAt: '',
      contractId: new Contract(testAddress),
      id: 'mockId',
      pagingToken: '',
      inSuccessfulContractCall: true,
      topic: [topic1, topic2],
      value: {} as xdr.ScVal,
    };

    const mockEventFilterValid: SorobanEventFilter = {
      topics: ['topic1', 'topic2'],
    };

    const mockEventFilterInvalid: SorobanEventFilter = {
      topics: ['topics3'],
    };

    it('should pass filter - valid address and topics', function () {
      expect(
        StellarBlockWrapped.filterEventProcessor(
          mockEvent,
          mockEventFilterValid,
          testAddress,
        ),
      ).toEqual(true);
    });

    it('should pass filter - no address and valid topics', function () {
      expect(
        StellarBlockWrapped.filterEventProcessor(
          mockEvent,
          mockEventFilterValid,
        ),
      ).toEqual(true);
    });

    it('should fail filter - valid address and invalid topics', function () {
      expect(
        StellarBlockWrapped.filterEventProcessor(
          mockEvent,
          mockEventFilterInvalid,
          testAddress,
        ),
      ).toEqual(false);
    });

    it('should fail filter - event not found', function () {
      mockEventFilterInvalid.topics = ['topic1', 'topic2', 'topic3'];
      expect(
        StellarBlockWrapped.filterEventProcessor(
          mockEvent,
          mockEventFilterInvalid,
        ),
      ).toEqual(false);
    });

    it('should pass filter - skip null topics', function () {
      mockEventFilterValid.topics = ['', 'topic2'];
      expect(
        StellarBlockWrapped.filterEventProcessor(
          mockEvent,
          mockEventFilterValid,
        ),
      ).toEqual(true);
    });

    it('should pass filer - valid contractId', function () {
      mockEventFilterValid.contractId = testAddress;
      expect(
        StellarBlockWrapped.filterEventProcessor(
          mockEvent,
          mockEventFilterValid,
        ),
      ).toEqual(true);
    });

    it('should fail filter - invalid contractId', function () {
      expect(
        StellarBlockWrapped.filterEventProcessor(mockEvent, {
          contractId: 'invalidaddress',
        }),
      ).toEqual(false);
    });

    it('should fail filter - invalid address', function () {
      expect(
        StellarBlockWrapped.filterEventProcessor(
          mockEvent,
          mockEventFilterValid,
          'invalidaddress',
        ),
      ).toEqual(false);
    });
  });
});
