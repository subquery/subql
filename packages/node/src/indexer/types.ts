// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ApiPromise } from '@polkadot/api';
import { ApiDecoration } from '@polkadot/api/types';
import type { HexString } from '@polkadot/util/types';
import { IBlock } from '@subql/node-core';
import {
  BlockHeader,
  LightSubstrateEvent,
  SubstrateBlock,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';

export interface BlockContent {
  block: SubstrateBlock;
  extrinsics: SubstrateExtrinsic[];
  events: SubstrateEvent[];
}

export interface LightBlockContent {
  block: BlockHeader; // A subset of SubstrateBlock
  events: LightSubstrateEvent[];
}

export type BestBlocks = Record<number, HexString>;

export type ApiAt = ApiDecoration<'promise'> & { rpc: ApiPromise['rpc'] };

export function isFullBlock(
  block: BlockContent | LightBlockContent,
): block is BlockContent {
  return (block as BlockContent).extrinsics !== undefined;
}

export function getBlockSize(
  block: IBlock<BlockContent | LightBlockContent>,
): number {
  return block.block.events.reduce(
    (acc, evt) => acc + evt.encodedLength,
    (block.block.block as SubstrateBlock)?.encodedLength ?? 0,
  );
}
