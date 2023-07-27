// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
  blockTimestamp: bigint;
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
  receipt: () => Promise<EthereumReceipt>;
  logs?: EthereumLog[];
  accessList?: string[];
  chainId?: string; // Hex string , example: "0x1"
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  args?: T;
};

export type FlareTransaction<T extends FlareResult = FlareResult> = EthereumTransaction<T>;

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
  transaction: EthereumTransaction;
};

export type FlareLog<T extends FlareResult = FlareResult> = EthereumLog<T>;

export type EthereumBlockWrapper = BlockWrapper<
  EthereumBlock,
  EthereumTransaction,
  EthereumLog,
  EthereumTransactionFilter,
  EthereumLogFilter
>;
