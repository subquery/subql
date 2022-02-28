// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiInterfaceEvents } from '@polkadot/api/types';
import { BlockContent } from './types';
import { AlgorandBlock } from './typesAlgo';

export interface ApiWrapper {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getRuntimeChain: () => string;
  getSpecName: () => string;
  getFinalizedBlockHeight: () => Promise<number>;
  getLastHeight: () => Promise<number>;
  getBlockHash?: (height: number) => void;
  fetchBlocksBatches: (
    bufferBlocks: number[],
    overallSpecNumber?: number,
  ) => Promise<AlgorandBlock[] | BlockContent[]>;
  disconnect?: () => Promise<void>;
  on?: (type: ApiInterfaceEvents, handler: (...args: any[]) => any) => void;
}
