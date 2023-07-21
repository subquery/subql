// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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

        //decode gives control chars around the string, remove them
        /* eslint-disable no-control-regex */
        const decodedTopic = Buffer.from(event.topic[i], 'base64')
          .toString()
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        /* eslint-enable no-control-regex */
        if (topic !== decodedTopic) {
          return false;
        }
      }
    }

    return true;
  }
}
