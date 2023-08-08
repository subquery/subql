// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  StellarBlock,
  StellarBlockWrapper,
  StellarEffect,
  StellarOperation,
  StellarTransaction,
} from '@subql/types-stellar';
import { Server, ServerApi } from 'stellar-sdk';
import { StellarBlockWrapped } from '../stellar/block.stellar';

export async function fetchEffectsForOperation(
  operationId: string,
  api: Server,
): Promise<StellarEffect[]> {
  const effects = (await api.effects().forOperation(operationId).call())
    .records;
  const wrappedEffects: StellarEffect[] = [];

  effects.forEach((effect) => {
    const wrappedEffect: StellarEffect = {
      ...effect,
      ledger: null,
      transaction: null,
      operation: null,
    };

    wrappedEffects.push(wrappedEffect);
  });

  return wrappedEffects;
}

export async function fetchOperationsForTransaction(
  transactionId: string,
  api: Server,
): Promise<StellarOperation[]> {
  const operations = (
    await api.operations().forTransaction(transactionId).call()
  ).records;

  return Promise.all(
    operations.map(async (op) => {
      const wrappedOp: StellarOperation = {
        ...op,
        ledger: null,
        transaction: null,
        effects: [] as StellarEffect[],
      };

      const effects = (await fetchEffectsForOperation(op.id, api)).map(
        (effect) => {
          effect.operation = JSON.parse(JSON.stringify(wrappedOp));
          return effect;
        },
      );

      wrappedOp.effects.push(...effects);

      return wrappedOp;
    }),
  );
}

export async function fetchTransactionsForLedger(
  sequence: number,
  api: Server,
): Promise<StellarTransaction[]> {
  const transactions = (await api.transactions().forLedger(sequence).call())
    .records;

  return Promise.all(
    transactions.map(async (tx) => {
      let account: ServerApi.AccountRecord;
      try {
        account = await tx.account();
      } catch (e) {
        if ((e as Error).name === 'NotFoundError') {
          account = null;
        } else {
          throw e;
        }
      }

      const wrappedTx: StellarTransaction = {
        ...tx,
        ledger: null,
        account: account,
        operations: [] as StellarOperation[],
        effects: [] as StellarEffect[],
      };

      const operations = (await fetchOperationsForTransaction(tx.id, api)).map(
        (op) => {
          op.transaction = JSON.parse(JSON.stringify(wrappedTx));
          op.effects = op.effects.map((effect) => {
            effect.transaction = JSON.parse(JSON.stringify(wrappedTx));
            return effect;
          });
          return op;
        },
      );

      wrappedTx.operations.push(...operations);
      operations.forEach((op) => {
        wrappedTx.effects.push(...op.effects);
      });

      return wrappedTx;
    }),
  );
}

export async function fetchAndWrapLedger(
  sequence: number,
  api: Server,
): Promise<StellarBlock> {
  const ledger = (await api
    .ledgers()
    .ledger(sequence)
    .call()) as unknown as ServerApi.LedgerRecord;

  const wrappedLedger: StellarBlock = {
    ...ledger,
    transactions: [] as StellarTransaction[],
    operations: [] as StellarOperation[],
    effects: [] as StellarEffect[],
  };

  const transactions = (await fetchTransactionsForLedger(sequence, api)).map(
    (tx) => {
      tx.ledger = JSON.parse(JSON.stringify(wrappedLedger));
      tx.operations = tx.operations.map((op) => {
        op.ledger = JSON.parse(JSON.stringify(wrappedLedger));
        op.effects = op.effects.map((effect) => {
          effect.ledger = JSON.parse(JSON.stringify(wrappedLedger));
          return effect;
        });
        return op;
      });
      return tx;
    },
  );

  transactions.forEach((tx) => {
    wrappedLedger.transactions.push(tx);
    wrappedLedger.operations.push(...tx.operations);
    tx.operations.forEach((op) => wrappedLedger.effects.push(...op.effects));
  });

  return wrappedLedger;
}

export async function fetchBlockBatches(
  batch: number[],
  api: Server,
): Promise<StellarBlockWrapper[]> {
  const ledgers = await Promise.all(
    batch.map((sequence) => fetchAndWrapLedger(sequence, api)),
  );
  return ledgers.map(
    (ledger) =>
      new StellarBlockWrapped(
        ledger,
        ledger.transactions,
        ledger.operations,
        ledger.effects,
      ),
  );
}
