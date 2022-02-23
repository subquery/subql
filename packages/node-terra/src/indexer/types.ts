// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Entity } from '@subql/types';
import { Block, BlockID, BlockInfo, EventsByType } from '@terra-money/terra.js';

export interface TerraBlockEvent {
  events: EventsByType[];
  block_id: BlockID;
}

export interface TerraBlockContent {
  block: BlockInfo;
  events: EventsByType[];
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
