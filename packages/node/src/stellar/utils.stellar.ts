// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
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
    blockHash: block.hash.toString(),
    parentHash: block.prev_hash.toString(),
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
