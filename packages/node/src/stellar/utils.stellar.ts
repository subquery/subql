// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Header, IBlock } from '@subql/node-core';
import { ApiWrapper, StellarBlockWrapper } from '@subql/types-stellar';

export function blockToHeader(blockHeight: number): Header {
  return {
    blockHeight: blockHeight,
    blockHash: blockHeight.toString(),
    parentHash: (blockHeight - 1).toString(),
  };
}

export function formatBlockUtil<
  B extends StellarBlockWrapper = StellarBlockWrapper,
>(block: B): IBlock<B> {
  return {
    block,
    getHeader: () => blockToHeader(block.block.sequence),
  };
}

export function calcInterval(api: ApiWrapper): number {
  return 6000;
}
