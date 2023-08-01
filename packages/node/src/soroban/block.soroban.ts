// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SorobanBlock,
  SorobanBlockFilter,
  SorobanBlockWrapper,
  SorobanEffect,
  SorobanEffectFilter,
  SorobanEvent,
  SorobanEventFilter,
  SorobanOperation,
  SorobanOperationFilter,
  SorobanTransaction,
  SorobanTransactionFilter,
} from '@subql/types-soroban';
import { Address, scValToNative, xdr } from 'soroban-client';
import { stringNormalizedEq } from '../utils/string';

export class SorobanBlockWrapped implements SorobanBlockWrapper {
  constructor(
    private _block: SorobanBlock,
    private _transactions: SorobanTransaction[],
    private _operations: SorobanOperation[],
    private _effects: SorobanEffect[],
  ) {}

  get block(): SorobanBlock {
    return this._block;
  }

  get transactions(): SorobanTransaction[] {
    return this._transactions;
  }

  get operations(): SorobanOperation[] {
    return this._operations;
  }

  get effects(): SorobanEffect[] {
    return this._effects;
  }

  static filterBlocksProcessor(
    block: SorobanBlock,
    filter: SorobanBlockFilter,
    address?: string,
  ): boolean {
    if (filter?.modulo && block.sequence % filter.modulo !== 0) {
      return false;
    }
    return true;
  }

  static filterTransactionProcessor(
    tx: SorobanTransaction,
    filter: SorobanTransactionFilter,
    address?: string,
  ): boolean {
    if (!filter) return true;
    if (filter.account && filter.account !== tx.source_account) {
      return false;
    }

    return true;
  }

  static filterOperationProcessor(
    op: SorobanOperation,
    filter: SorobanOperationFilter,
    address?: string,
  ): boolean {
    if (!filter) return true;
    if (filter.source_account && filter.source_account !== op.source_account) {
      return false;
    }
    if (filter.type && filter.type !== op.type) {
      return false;
    }

    return true;
  }

  static filterEffectProcessor(
    effect: SorobanEffect,
    filter: SorobanEffectFilter,
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
  /*
  static filterEventProcessor(
    event: SorobanEvent,
    filter: SorobanEventFilter,
    address?: string,
  ): boolean {
    if (address && !stringNormalizedEq(address, event.contractId)) {
      return false;
    }

    if (!filter) return true;

    if (filter.contractId && filter.contractId !== event.contractId) {
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

        if (topic !== event.topic[i]) {
          return false;
        }
      }
    }

    return true;
  }

  static decodeScVals(scVal: xdr.ScVal): any {
    switch (scVal.switch()) {
      case xdr.ScValType.scvBool():
        return scVal.b();
      case xdr.ScValType.scvSymbol():
        return scVal.sym().toString();
      case xdr.ScValType.scvU64():
        return scVal.u64().low;
      case xdr.ScValType.scvAddress(): {
        try {
          return Address.account(
            scVal.address().accountId().value(),
          ).toString();
        } catch (error) {
          return Address.contract(scVal.address().contractId()).toString();
        }
      }
      case xdr.ScValType.scvString(): {
        return Buffer.from(scVal.str().toString(), 'base64').toString();
      }
      case xdr.ScValType.scvBytes():
        return scVal.bytes();
      case xdr.ScValType.scvI128(): {
        const low = scVal.i128().lo();
        const high = scVal.i128().hi();
        return BigInt(low.low) | (BigInt(low.high) << BigInt(32));
      }
      case xdr.ScValType.scvMap():
        return Object.fromEntries(
          scVal.map()!.map((entry) => {
            const key = entry.key().sym();
            return [key, SorobanBlockWrapped.decodeScVals(entry.val())];
          }),
        );
      default:
        return scValToNative(scVal);
    }
  }
  */
}
