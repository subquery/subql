// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Block} from '@ethersproject/abstract-provider';

export interface ApiWrapper {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getRuntimeChain: () => string;
  getChainId: () => number;
  getSpecName: () => string;
  getFinalizedBlockHeight: () => Promise<number>;
  getBestBlockHeight: () => Promise<number>;
  getBlockByHeightOrHash: (hashOrHeight: number | string) => Promise<Block>;
}
