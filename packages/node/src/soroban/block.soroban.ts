// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { getLogger } from '@subql/node-core';
import {
  SorobanBlock,
  SorobanBlockWrapper,
  SorobanEvent,
  SorobanEventFilter,
} from '@subql/types-soroban';
import { Address, xdr } from 'soroban-client';
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

  static decodeScVals(value: xdr.ScVal): any {
    switch (value.switch()) {
      case xdr.ScValType.scvBytes(): {
        const buffer = value.bytes();
        return buffer.toString();
      }
      case xdr.ScValType.scvSymbol(): {
        return value.sym().toString();
      }
      case xdr.ScValType.scvAddress(): {
        return Address.fromScVal(value).toString();
      }
      case xdr.ScValType.scvString(): {
        return Buffer.from(value.str().toString(), 'base64').toString();
      }
      default:
        throw new Error(
          `Unable to decode event: Unknown ScValType ${value.switch().name}`,
        );
    }
  }
}
