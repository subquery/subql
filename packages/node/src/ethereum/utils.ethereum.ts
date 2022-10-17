// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getAddress } from '@ethersproject/address';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Zero } from '@ethersproject/constants';
import {
  ApiWrapper,
  EthereumBlock,
  EthereumLog,
  EthereumReceipt,
  EthereumResult,
  EthereumTransaction,
} from '@subql/types-ethereum';
import { ethers } from 'ethers';

export function calcInterval(api: ApiWrapper): number {
  // TODO find a way to get this from the blockchain
  return 6000;
}

function handleAddress(value: string): string {
  if (value === '0x') {
    return null;
  }
  return getAddress(value);
}

function handleNumber(value: string | number): BigNumber {
  if (value === undefined) {
    return Zero;
  }
  if (value === '0x') {
    return Zero;
  }
  return BigNumber.from(value);
}

export function formatBlock(block: Record<string, any>): EthereumBlock {
  const newBlock: EthereumBlock = {
    difficulty: handleNumber(block.difficulty).toBigInt(),
    extDataGasUsed: block.extDataGasUsed,
    extDataHash: block.extDataHash,
    gasLimit: handleNumber(block.gasLimit).toBigInt(),
    gasUsed: handleNumber(block.gasUsed).toBigInt(),
    hash: block.hash,
    logsBloom: block.logsBloom,
    miner: block.miner,
    mixHash: block.mixHash,
    nonce: block.nonce,
    number: handleNumber(block.number).toNumber(),
    parentHash: block.parentHash,
    receiptsRoot: block.receiptsRoot,
    sha3Uncles: block.sha3Uncles,
    size: handleNumber(block.size).toBigInt(),
    stateRoot: block.stateRoot,
    timestamp: handleNumber(block.timestamp).toBigInt(),
    totalDifficulty: handleNumber(block.totalDifficulty).toBigInt(),
    transactions: block.transactions,
    transactionsRoot: block.transactionsRoot,
    uncles: block.uncles,
    baseFeePerGas: block.baseFeePerGas
      ? handleNumber(block.baseFeePerGas).toBigInt()
      : undefined,
    blockGasCost: block.blockGasCost
      ? handleNumber(block.blockGasCost).toBigInt()
      : undefined,
    blockExtraData: block.blockExtraData,
    logs: [], // Filled in at AvalancheBlockWrapped constructor
  };

  return newBlock;
}
export function formatLog(
  log: EthereumLog<EthereumResult> | EthereumLog,
  block: EthereumBlock,
): EthereumLog<EthereumResult> | EthereumLog {
  const newLog: EthereumLog<EthereumResult> = {
    address: log.address,
    topics: log.topics,
    data: log.data,
    blockNumber: handleNumber(log.blockNumber).toNumber(),
    transactionHash: log.transactionHash,
    transactionIndex: handleNumber(log.transactionIndex).toNumber(),
    blockHash: log.blockHash,
    logIndex: handleNumber(log.logIndex).toNumber(),
    removed: log.removed,
    args: log.args,
    block,
  };
  return newLog;
}

export function formatTransaction(
  tx: Record<string, any>,
): EthereumTransaction {
  const transaction: EthereumTransaction = {
    blockHash: tx.blockHash,
    blockNumber: handleNumber(tx.blockNumber).toNumber(),
    from: tx.from,
    gas: handleNumber(tx.gas).toBigInt(),
    gasPrice: handleNumber(tx.gasPrice).toBigInt(),
    hash: tx.hash,
    input: tx.input,
    nonce: handleNumber(tx.nonce).toBigInt(),
    to: tx.to,
    transactionIndex: handleNumber(tx.transactionIndex).toBigInt(),
    value: handleNumber(tx.value).toBigInt(),
    type: tx.type,
    v: handleNumber(tx.v).toBigInt(),
    r: tx.r,
    s: tx.s,
    accessList: tx.accessList,
    chainId: tx.chainId,
    maxFeePerGas: tx.maxFeePerGas
      ? handleNumber(tx.maxFeePerGas).toBigInt()
      : undefined,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? handleNumber(tx.maxPriorityFeePerGas).toBigInt()
      : undefined,
    receipt: undefined, // Filled in at AvalancheApi.fetchBlocks
  };
  return transaction;
}

export function formatReceipt(
  receipt: Record<string, any>,
  block: EthereumBlock,
): EthereumReceipt {
  const newReceipt: EthereumReceipt = {
    blockHash: receipt.blockHash,
    blockNumber: handleNumber(receipt.blockNumber).toNumber(),
    contractAddress: receipt.contractAddress,
    cumulativeGasUsed: handleNumber(receipt.cumulativeGasUsed).toBigInt(),
    effectiveGasPrice: handleNumber(receipt.effectiveGasPrice).toBigInt(),
    from: receipt.from,
    gasUsed: handleNumber(receipt.gasUsed).toBigInt(),
    logs: receipt.logs.map((log) => formatLog(log, block)),
    logsBloom: receipt.logsBloom,
    status: Boolean(handleNumber(receipt.status).toNumber()),
    to: receipt.to,
    transactionHash: receipt.transactionHash,
    transactionIndex: handleNumber(receipt.transactionIndex).toNumber(),
    type: receipt.type,
  };
  return newReceipt;
}
