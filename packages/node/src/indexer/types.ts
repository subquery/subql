// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  CosmosBlock,
  CosmosEvent,
  CosmosTransaction,
  CosmosMessage,
} from '@subql/types-cosmos';

export interface BlockContent {
  block: CosmosBlock;
  transactions: CosmosTransaction[];
  messages: CosmosMessage[];
  events: CosmosEvent[];
}

export type BestBlocks = Record<number, string>;
