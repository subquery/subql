// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  AvalancheBlock,
  AvalancheLog,
  AvalancheReceipt,
  AvalancheResult,
  AvalancheTransaction,
} from '@subql/types-avalanche';
import { BigNumber } from 'ethers';

export function formatBlock(block: Record<string, any>): AvalancheBlock {
  const newBlock: AvalancheBlock = {
    difficulty: BigNumber.from(block.difficulty).toBigInt(),
    extDataGasUsed: block.extDataGasUsed,
    extDataHash: block.extDataHash,
    gasLimit: BigNumber.from(block.gasLimit).toBigInt(),
    gasUsed: BigNumber.from(block.gasUsed).toBigInt(),
    hash: block.hash,
    logsBloom: block.logsBloom,
    miner: block.miner,
    mixHash: block.mixHash,
    nonce: block.nonce,
    number: BigNumber.from(block.number).toNumber(),
    parentHash: block.parentHash,
    receiptsRoot: block.receiptsRoot,
    sha3Uncles: block.sha3Uncles,
    size: BigNumber.from(block.size).toBigInt(),
    stateRoot: block.stateRoot,
    timestamp: BigNumber.from(block.timestamp).toBigInt(),
    totalDifficulty: BigNumber.from(block.totalDifficulty).toBigInt(),
    transactions: block.transactions,
    transactionsRoot: block.transactionsRoot,
    uncles: block.uncles,
    baseFeePerGas: block.baseFeePerGas
      ? BigNumber.from(block.baseFeePerGas).toBigInt()
      : undefined,
    blockGasCost: block.blockGasCost
      ? BigNumber.from(block.blockGasCost).toBigInt()
      : undefined,
    blockExtraData: block.blockExtraData,
    logs: [], // Filled in at AvalancheBlockWrapped constructor
  };

  return newBlock;
}
export function formatLog(
  log: AvalancheLog<AvalancheResult> | AvalancheLog,
  block: AvalancheBlock,
): AvalancheLog<AvalancheResult> | AvalancheLog {
  const newLog: AvalancheLog<AvalancheResult> = {
    address: log.address,
    topics: log.topics,
    data: log.data,
    blockNumber: BigNumber.from(log.blockNumber).toNumber(),
    transactionHash: log.transactionHash,
    transactionIndex: BigNumber.from(log.transactionIndex).toNumber(),
    blockHash: log.blockHash,
    logIndex: BigNumber.from(log.logIndex).toNumber(),
    removed: log.removed,
    args: log.args,
    block,
  };
  return newLog;
}

export function formatTransaction(
  tx: Record<string, any>,
): AvalancheTransaction {
  const transaction: AvalancheTransaction = {
    blockHash: tx.blockHash,
    blockNumber: BigNumber.from(tx.blockNumber).toNumber(),
    from: tx.from,
    gas: BigNumber.from(tx.gas).toBigInt(),
    gasPrice: BigNumber.from(tx.gasPrice).toBigInt(),
    hash: tx.hash,
    input: tx.input,
    nonce: BigNumber.from(tx.nonce).toBigInt(),
    to: tx.to,
    transactionIndex: BigNumber.from(tx.transactionIndex).toBigInt(),
    value: BigNumber.from(tx.value).toBigInt(),
    type: tx.type,
    v: BigNumber.from(tx.v).toBigInt(),
    r: tx.r,
    s: tx.s,
    accessList: tx.accessList,
    chainId: tx.chainId,
    maxFeePerGas: tx.maxFeePerGas
      ? BigNumber.from(tx.maxFeePerGas).toBigInt()
      : undefined,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? BigNumber.from(tx.maxPriorityFeePerGas).toBigInt()
      : undefined,
    receipt: undefined, // Filled in at AvalancheApi.fetchBlocks
  };
  return transaction;
}

export function formatReceipt(
  receipt: Record<string, any>,
  block: AvalancheBlock,
): AvalancheReceipt {
  const newReceipt: AvalancheReceipt = {
    blockHash: receipt.blockHash,
    blockNumber: BigNumber.from(receipt.blockNumber).toNumber(),
    contractAddress: receipt.contractAddress,
    cumulativeGasUsed: BigNumber.from(receipt.cumulativeGasUsed).toBigInt(),
    effectiveGasPrice: BigNumber.from(receipt.effectiveGasPrice).toBigInt(),
    from: receipt.from,
    gasUsed: BigNumber.from(receipt.gasUsed).toBigInt(),
    logs: receipt.logs.map((log) => formatLog(log, block)),
    logsBloom: receipt.logsBloom,
    status: Boolean(BigNumber.from(receipt.status).toNumber()),
    to: receipt.to,
    transactionHash: receipt.transactionHash,
    transactionIndex: BigNumber.from(receipt.transactionIndex).toNumber(),
    type: receipt.type,
  };
  return newReceipt;
}
