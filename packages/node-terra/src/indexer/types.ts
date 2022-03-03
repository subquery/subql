// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TerraCall, TerraBlock, TerraEvent, Entity } from '@subql/types-terra';
import { BlockID, EventsByType } from '@terra-money/terra.js';

export interface TerraBlockEvent {
  events: EventsByType[];
  block_id: BlockID;
}

export interface TerraBlockContent {
  block: TerraBlock;
  events: TerraEvent[];
  call: TerraCall[];
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
