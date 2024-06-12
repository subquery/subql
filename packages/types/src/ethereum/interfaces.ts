// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BlockFilter} from '@subql/types-core';

export type EthereumBlockFilter = BlockFilter;

/**
 * Represents a filter for Ethereum Transactions
 * @interface
 * @extends {EthereumTransactionFilter}
 */
export interface EthereumTransactionFilter {
  /**
   * The address of sender of the transaction
   * @example
   * from: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
   * */
  from?: string;
  /**
   * The to address field within a transaction. This is either the contract address or the recipient if it is an ether transfer.
   * @example
   * to: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
   **/
  to?: string;
  /**
   * The function sighash or function signature of the call. This is the first 32bytes of the data field
   * @example
   * function: 'setminimumStakingAmount(uint256 amount)',
   * @example
   * function: null, // This will filter transactions that have no input
   * @example
   * function: '0x, // This will filter transactions that have no input
   * */
  function?: string | null;
}

/**
 * Represents a filter for Ethereum logs
 * @interface
 * @extends {EthereumLogFilter}
 */
export interface EthereumLogFilter {
  /**
   * You can filter by the topics in a log.
   * These can be an address, event signature, null, '!null' or undefined
   * @example
   * topics: ['Transfer(address, address, uint256)'],
   * @example
   * topics: ['Transfer(address, address, uint256)', undefined, '0x220866B1A2219f40e72f5c628B65D54268cA3A9D']
   */
  topics?: Array<string | null | undefined>;
}

export interface EthereumResult extends ReadonlyArray<any> {
  readonly [key: string]: any;
}

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
  /**
   * @return {EthereumReceipt} This return type is generic because some networks may return more fields such as OP based networks. This allows your to override the type easily
   **/
  receipt: <R extends EthereumReceipt = EthereumReceipt>() => Promise<R>;
  logs?: EthereumLog[];
  accessList?: string[];
  chainId?: string; // Hex string , example: "0x1"
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  args?: T;
};

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

export type LightEthereumLog<T extends EthereumResult = EthereumResult> = Omit<
  EthereumLog<T>,
  'transaction' | 'block'
> & {
  block: LightEthereumBlock;
};

export type LightEthereumBlock = Omit<EthereumBlock, 'transactions' | 'logs'> & {
  logs: LightEthereumLog[];
  transactions: string[];
};
