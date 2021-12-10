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
