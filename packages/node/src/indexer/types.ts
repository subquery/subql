// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  CosmosBlock,
  CosmosEvent,
  Entity,
  CosmosTransaction,
  CosmosMessage,
} from '@subql/types-cosmos';

export interface BlockContent {
  block: CosmosBlock;
  transactions: CosmosTransaction[];
  messages: CosmosMessage[];
  events: CosmosEvent[];
}

export enum OperationType {
  Set = 'Set',
  Remove = 'Remove',
}

export type OperationEntity = {
  operation: OperationType;
  entityType: string;
  data: Entity | string;
};
