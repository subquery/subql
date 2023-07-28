// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SorobanBlock,
  SorobanBlockWrapper,
  SorobanEffect,
  SorobanOperation,
  SorobanTransaction,
} from '@subql/types-soroban';
import { Server } from 'stellar-sdk';
import { SorobanBlockWrapped } from '../soroban/block.soroban';

export async function fetchEffectsForOperation(
  operationId: string,
  api: Server,
): Promise<SorobanEffect[]> {
  const effects = (await api.effects().forOperation(operationId).call())
    .records;
  const wrappedEffects: SorobanEffect[] = [];

  effects.forEach((effect) => {
    const wrappedEffect: SorobanEffect = {
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
): Promise<SorobanOperation[]> {
  const operations = (
    await api.operations().forTransaction(transactionId).call()
  ).records;
  return Promise.all(
    operations.map(async (op) => {
      const wrappedOp: SorobanOperation = {
        ...op,
        transaction: null,
        effects: [] as SorobanEffect[],
      };

      const effects = await fetchEffectsForOperation(op.id, api);
      wrappedOp.effects.push(...effects);

      return wrappedOp;
    }),
  );
}

export async function fetchTransactionsForLedger(
  sequence: number,
  api: Server,
): Promise<SorobanTransaction[]> {
  const transactions = (await api.transactions().forLedger(sequence).call())
    .records;

  return Promise.all(
    transactions.map(async (tx) => {
      const account = await tx.account();
      const wrappedTx: SorobanTransaction = {
        ...tx,
        ledger: null,
        account: account,
        operations: [] as SorobanOperation[],
        effects: [] as SorobanEffect[],
      };

      const operations = await fetchOperationsForTransaction(tx.id, api);
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
): Promise<SorobanBlock> {
  const ledger = (await api.ledgers().ledger(sequence).call()).records[0];

  const wrappedLedger: SorobanBlock = {
    ...ledger,
    transactions: [] as SorobanTransaction[],
    operations: [] as SorobanOperation[],
    effects: [] as SorobanEffect[],
  };

  const transactions = await fetchTransactionsForLedger(sequence, api);

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
): Promise<SorobanBlockWrapper[]> {
  const ledgers = await Promise.all(
    batch.map((sequence) => fetchAndWrapLedger(sequence, api)),
  );
  return ledgers.map(
    (ledger) =>
      new SorobanBlockWrapped(
        ledger,
        ledger.transactions,
        ledger.operations,
        ledger.effects,
      ),
  );
}
