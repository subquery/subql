// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Horizon } from '@stellar/stellar-sdk';
import { Header, IBlock } from '@subql/node-core';
import {
  ApiWrapper,
  StellarBlock,
  StellarBlockWrapper,
} from '@subql/types-stellar';

export function stellarBlockToHeader(
  block: StellarBlock | Horizon.ServerApi.LedgerRecord,
): Header {
  return {
    blockHeight: block.sequence,
    // Stellar has instant finalization and there is no RPC for getting blocks by hash.
    // For these reasons we use the block numbers for hashes so that unfinalized blocks works.
    blockHash: block.sequence.toString(),
    parentHash: (block.sequence - 1).toString(),
    // blockHash: block.hash.toString(),
    // parentHash: block.prev_hash.toString(),
    timestamp: new Date(block.closed_at),
  };
}

export function formatBlockUtil<
  B extends StellarBlockWrapper = StellarBlockWrapper,
>(block: B): IBlock<B> {
  return {
    block,
    getHeader: () => stellarBlockToHeader(block.block),
  };
}

export function calcInterval(api: ApiWrapper): number {
  return 6000;
}

export const DEFAULT_PAGE_SIZE = 150;
