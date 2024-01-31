// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ApiPromise } from '@polkadot/api';
import { ApiDecoration } from '@polkadot/api/types';
import type { HexString } from '@polkadot/util/types';
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
