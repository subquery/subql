// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
  beginBlockEvents: CosmosEvent[];
  endBlockEvents: CosmosEvent[];
}

export type BestBlocks = Record<number, string>;
