// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BlockWrapper } from '../interfaces';

export interface AvalancheCallFilter {
  from?: string;
  to?: string;
  function?: string;
}

export interface AvalancheEventFilter {
  topics?: Array<string | null | undefined>;
  address?: string;
}

export interface AvalancheResult extends ReadonlyArray<any> {
  readonly [key: string]: any;
}

export type AvalancheBlock = {
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string;
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  number: string;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: string;
  stateRoot: string;
  timestamp: string;
  totalDifficulty: string;
  transactions: AvalancheTransaction[];
  transactionsRoot: string;
  uncles: string[];
};

export type AvalancheTransaction<T extends AvalancheResult = AvalancheResult> = {
  blockHash: string;
  blockNumber: string;
  from: string;
  gas: string;
  gasPrice: string;
  hash: string;
  input: string;
  nonce: string;
  to: string;
  transactionIndex: string;
  value: string;
  v: string;
  r: string;
  s: string;
  args?: T;
};

export type AvalancheEvent<T extends AvalancheResult = AvalancheResult> = {
  logIndex: string;
  blockNumber: string;
  blockHash: string;
  transactionHash: string;
  transactionIndex: string;
  address: string;
  data: string;
  topics: string[];
  args?: T;
};

export interface AvalancheBlockWrapper
  extends BlockWrapper<
    AvalancheBlock,
    AvalancheTransaction,
    AvalancheEvent,
    AvalancheCallFilter,
    AvalancheEventFilter
  > {
  getTransactions: (filters?: string[]) => Record<string, any>;
}