// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ethers} from 'ethers';
import {BlockWrapper} from '../interfaces';

export interface EthereumBlockFilter {
  modulo?: number;
}

export interface EthereumTransactionFilter {
  from?: string;
  to?: string;
  function?: string;
}

export interface EthereumLogFilter {
  topics?: Array<string | null | undefined>;
  address?: string;
}

export interface EthereumResult extends ReadonlyArray<any> {
  readonly [key: string]: any;
}
export type EthereumBlock = ethers.providers.Block & {
  logs?: EthereumLog[];
};

export type EthereumTransaction = ethers.providers.TransactionResponse & {
  receipt: ethers.providers.TransactionReceipt;
};

export type EthereumLog<T extends EthereumResult = EthereumResult> = ethers.providers.Log & {
  args?: T;
  block?: EthereumBlock;
};

export type EthereumBlockWrapper = BlockWrapper<
  EthereumBlock,
  EthereumTransaction,
  EthereumLog,
  EthereumTransactionFilter,
  EthereumLogFilter
>;
