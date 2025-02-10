// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EthereumBlock, LightEthereumBlock } from '@subql/types-ethereum';

export type BlockContent = EthereumBlock | LightEthereumBlock;

export function getBlockSize(block: BlockContent): number {
  return Number(block.size);
}
