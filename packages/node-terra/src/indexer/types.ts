// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  TerraBlock,
  TerraEvent,
  Entity,
  TerraTransaction,
  TerraMessage,
} from '@subql/types-terra';
import { BlockID, EventsByType } from '@terra-money/terra.js';

export interface TerraBlockEvent {
  events: EventsByType[];
  block_id: BlockID;
}

export interface TerraBlockContent {
  block: TerraBlock;
  transactions: TerraTransaction[];
  messages: TerraMessage[];
  events: TerraEvent[];
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
