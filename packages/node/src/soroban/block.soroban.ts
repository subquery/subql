// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SorobanBlock,
  SorobanBlockWrapper,
  SorobanEvent,
  SorobanEventFilter,
} from '@subql/types-soroban';
import { stringNormalizedEq } from '../utils/string';

export class SorobanBlockWrapped implements SorobanBlockWrapper {
  constructor(
    //private _txs: SorobanTransaction[],
    private _events: SorobanEvent[],
    private _block: SorobanBlock,
  ) {}

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

    if (filter.topics) {
      for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
        const topic = filter.topics[i];
        if (!topic) {
          continue;
        }

        if (!event.topic[i]) {
          return false;
        }
        if (!stringNormalizedEq(topic, event.topic[i])) {
          return false;
        }
      }
    }
    return true;
  }
}
