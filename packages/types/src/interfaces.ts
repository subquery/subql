// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Block} from '@ethersproject/abstract-provider';
import {EthereumBlock, LightEthereumBlock} from './ethereum';

export interface ApiWrapper {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getRuntimeChain: () => string;
  getChainId: () => number;
  getSpecName: () => string;
  getFinalizedBlockHeight: () => Promise<number>;
  getBestBlockHeight: () => Promise<number>;
  getBlockByHeightOrHash: (hashOrHeight: number | string) => Promise<Block>;
  fetchBlocks: (bufferBlocks: number[]) => Promise<EthereumBlock[] | LightEthereumBlock[]>; // TODO make sure this is correct
}
