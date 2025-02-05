// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {StellarBlock, StellarEffect, SorobanEvent, StellarOperation, StellarTransaction} from './stellar';

export interface BlockWrapper<
  B extends StellarBlock = StellarBlock,
  T extends StellarTransaction = StellarTransaction,
  O extends StellarOperation = StellarOperation,
  EF extends StellarEffect = StellarEffect,
  E extends SorobanEvent = SorobanEvent
> {
  block: B;
  transactions: T[];
  operations: O[];
  effects: EF[];
  events?: E[];
}

export interface ApiWrapper {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getRuntimeChain: () => string;
  getChainId: () => string;
  getSpecName: () => string;
  getFinalizedBlockHeight: () => Promise<number>;
  getBestBlockHeight: () => Promise<number>;
  //getBlockByHeightOrHash: (hashOrHeight: number | string) => Promise<Block>;
}

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;
