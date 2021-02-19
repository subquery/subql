// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubstrateBlock,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';

export interface BlockContent {
  block: SubstrateBlock;
  extrinsics: SubstrateExtrinsic[];
  events: SubstrateEvent[];
}

export enum BlockEvents {
  BlockProcessing = 'processing_block_event',
}

export interface BlockPayload {
  data: { height: number; timestamp: number };
  name: BlockEvents;
}
