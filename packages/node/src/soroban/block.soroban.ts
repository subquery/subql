// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SorobanBlock,
  SorobanBlockWrapper,
  SorobanEvent,
  SorobanEventFilter,
} from '@subql/types-soroban';
import { Address, scValToNative, xdr } from 'soroban-client';
import { stringNormalizedEq } from '../utils/string';

export class SorobanBlockWrapped implements SorobanBlockWrapper {
  constructor(private _events: SorobanEvent[], private _block: SorobanBlock) {}

  get block(): SorobanBlock {
    return this._block;
  }

  get events(): SorobanEvent[] {
    return this._events;
  }

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
}
