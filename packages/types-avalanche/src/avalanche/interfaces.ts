// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BlockWrapper} from '../interfaces';

export interface AvalancheTransactionFilter {
  from?: string;
  to?: string;
  function?: string;
}

export interface AvalancheLogFilter {
  topics?: Array<string | null | undefined>;
  address?: string;
}

export interface AvalancheResult extends ReadonlyArray<any> {
  readonly [key: string]: any;
}

export type AvalancheBlock = {
  blockExtraData: string;
  difficulty: bigint;
  extDataGasUsed: string;
  extDataHash: string;
  gasLimit: bigint;
  gasUsed: bigint;
  hash: string;
  logs: AvalancheLog[];
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  number: number;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: bigint;
  stateRoot: string;
  timestamp: bigint;
  totalDifficulty: bigint;
  transactions: AvalancheTransaction[];
  transactionsRoot: string;
  uncles: string[];
  baseFeePerGas?: bigint;
  blockGasCost?: bigint;
};

export type AvalancheTransaction<T extends AvalancheResult = AvalancheResult> = {
  blockHash: string;
  blockNumber: number;
  from: string;
  gas: bigint;
  gasPrice: bigint;
  hash: string;
  input: string;
  nonce: bigint;
  to: string;
  transactionIndex: bigint;
  value: bigint;
  type: string;
  v: bigint;
  r: string;
  s: string;
  receipt: AvalancheReceipt;
  accessList?: string[];
  chainId?: string;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  args?: T;
};

export type AvalancheLog<T extends AvalancheResult = AvalancheResult> = {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
  args?: T;
};

export type AvalancheReceipt = {
  blockHash: string;
  blockNumber: number;
  contractAddress: string;
  cumulativeGasUsed: bigint;
  effectiveGasPrice: bigint;
  from: string;
  gasUsed: bigint;
  logs: AvalancheLog[];
  logsBloom: string;
  status: boolean;
  to: string;
  transactionHash: string;
  transactionIndex: number;
  type: string;
};

export type AvalancheBlockWrapper = BlockWrapper<
  AvalancheBlock,
  AvalancheTransaction,
  AvalancheLog,
  AvalancheTransactionFilter,
  AvalancheLogFilter
>;
