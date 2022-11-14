// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BlockWrapper} from '../interfaces';

export interface EthereumBlockFilter {
  modulo?: number;
  timestamp?: string;
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

export type FlareResult = EthereumResult;

export type EthereumBlock = {
  blockExtraData: string;
  difficulty: bigint;
  extDataGasUsed: string;
  extDataHash: string;
  gasLimit: bigint;
  gasUsed: bigint;
  hash: string;
  logs: EthereumLog[];
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
  transactions: EthereumTransaction[];
  transactionsRoot: string;
  uncles: string[];
  baseFeePerGas?: bigint;
  blockGasCost?: bigint;
};

export type FlareBlock = EthereumBlock;

export type EthereumTransaction<T extends EthereumResult = EthereumResult> = {
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
  receipt: EthereumReceipt;
  accessList?: string[];
  chainId?: string;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  args?: T;
};

export type FlareTransaction = EthereumTransaction;

export type EthereumReceipt = {
  blockHash: string;
  blockNumber: number;
  contractAddress: string;
  cumulativeGasUsed: bigint;
  effectiveGasPrice: bigint;
  from: string;
  gasUsed: bigint;
  logs: EthereumLog[];
  logsBloom: string;
  status: boolean;
  to: string;
  transactionHash: string;
  transactionIndex: number;
  type: string;
};

export type FlareReceipt = EthereumReceipt;

export type EthereumLog<T extends EthereumResult = EthereumResult> = {
  address: string;
  topics: string[];
  data: string;
  blockHash: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
  removed: boolean;
  args?: T;
  block: EthereumBlock;
};

export type FlareLog = EthereumLog;

export type EthereumBlockWrapper = BlockWrapper<
  EthereumBlock,
  EthereumTransaction,
  EthereumLog,
  EthereumTransactionFilter,
  EthereumLogFilter
>;
