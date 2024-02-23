// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  StellarBlock,
  StellarBlockFilter,
  StellarBlockWrapper,
  StellarEffect,
  StellarEffectFilter,
  SorobanEvent,
  SorobanEventFilter,
  StellarOperation,
  StellarOperationFilter,
  StellarTransaction,
  StellarTransactionFilter,
} from '@subql/types-stellar';
import { Address, scValToNative, xdr } from 'stellar-sdk';
import { stringNormalizedEq } from '../utils/string';

export class StellarBlockWrapped implements StellarBlockWrapper {
  constructor(
    private _block: StellarBlock,
    private _transactions: StellarTransaction[],
    private _operations: StellarOperation[],
    private _effects: StellarEffect[],
    private _events: SorobanEvent[],
  ) {}

  get block(): StellarBlock {
    return this._block;
  }

  get transactions(): StellarTransaction[] {
    return this._transactions;
  }

  get operations(): StellarOperation[] {
    return this._operations;
  }

  get effects(): StellarEffect[] {
    return this._effects;
  }

  get events(): SorobanEvent[] {
    return this._events;
  }

  static filterBlocksProcessor(
    block: StellarBlock,
    filter: StellarBlockFilter,
    address?: string,
  ): boolean {
    if (filter?.modulo && block.sequence % filter.modulo !== 0) {
      return false;
    }
    return true;
  }

  static filterTransactionProcessor(
    tx: StellarTransaction,
    filter: StellarTransactionFilter,
    address?: string,
  ): boolean {
    if (!filter) return true;
    if (filter.account && filter.account !== (tx as any).source_account) {
      return false;
    }

    return true;
  }

  static filterOperationProcessor(
    op: StellarOperation,
    filter: StellarOperationFilter,
    address?: string,
  ): boolean {
    if (!filter) return true;
    if (filter.sourceAccount && filter.sourceAccount !== op.source_account) {
      return false;
    }
    if (filter.type && filter.type !== op.type) {
      return false;
    }

    return true;
  }

  static filterEffectProcessor(
    effect: StellarEffect,
    filter: StellarEffectFilter,
    address?: string,
  ): boolean {
    if (!filter) return true;
    if (filter.account && filter.account !== effect.account) {
      return false;
    }
    if (filter.type && filter.type !== effect.type) {
      return false;
    }

    return true;
  }

  static filterEventProcessor(
    event: SorobanEvent,
    filter: SorobanEventFilter,
    address?: string,
  ): boolean {
    if (address && !stringNormalizedEq(address, event.contractId.toString())) {
      return false;
    }

    if (!filter) return true;

    if (
      filter.contractId &&
      filter.contractId !== event.contractId?.toString()
    ) {
      return false;
    }

    if (filter.topics) {
      for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
        const topic = filter.topics[i];
        if (!topic) {
          continue;
        }

        if (!event.topic[i]) {
          return false;
        }
        if (topic !== scValToNative(event.topic[i])) {
          return false;
        }
      }
    }
    return true;
  }
}
