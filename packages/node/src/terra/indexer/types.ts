import { BlockInfo, EventsByType } from '@terra-money/terra.js';

export interface TerraBlockContent {
  block: BlockInfo;
  events: EventsByType[];
}
