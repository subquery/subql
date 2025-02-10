// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { DictionaryV2QueryEntry } from '@subql/node-core';

export interface RawEthBlock {
  header: {
    parentHash: string;
    sha3Uncles: string;
    miner: string;
    stateRoot: string;
    transactionRoot: string;
    receiptsRoot: string;
    logsBloom: string;
    difficulty: bigint;
    number: bigint;
    gasLimit: bigint;
    gasUsed: bigint;
    timestamp: bigint;
    extraData: string;
    mixHash: string;
    nonce: string;
    baseFeePerGas: bigint;
    withdrawalsRoot: string;
    blobGasUsed: bigint;
    excessBlobGas: bigint;
    parentBeaconBlockRoot: string;
    hash: string;
  };
  transactions: RawEthTransaction[];
  logs: RawEthLog[];
}

export interface RawEthTransaction {
  type: string;
  nonce: bigint;
  to: string;
  gas: bigint;
  gasPrice: bigint;
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
  value: bigint;
  v: bigint;
  r: string;
  s: string;
  input: string;
  hash: string;
  from: string;
  func: string;
  gasLimit: bigint;
}

export interface RawEthLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: bigint;
  transactionHash: string;
  transactionIndex: bigint;
  blockHash: string;
  logIndex: bigint;
  removed: boolean;
}

/**
 * Eth dictionary RPC request filter conditions
 */
export interface EthDictionaryV2QueryEntry extends DictionaryV2QueryEntry {
  logs?: EthDictionaryLogConditions[];
  transactions?: EthDictionaryTxConditions[];
}

export interface EthDictionaryLogConditions {
  address?: string[];
  topics0?: string[];
  topics1?: string[];
  topics2?: string[];
}

export interface EthDictionaryTxConditions {
  to?: (string | null)[];
  from?: string[];
  data?: string[];
}
