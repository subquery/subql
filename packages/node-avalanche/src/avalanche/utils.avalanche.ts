// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  AvalancheBlock,
  AvalancheLog,
  AvalancheReceipt,
  AvalancheResult,
  AvalancheTransaction,
} from '@subql/types';
import { BigNumber } from 'ethers';

export function formatBlock(block: Record<string, any>): AvalancheBlock {
  const newBlock = {} as AvalancheBlock;
  if (block.baseFeePerGas) {
    newBlock.baseFeePerGas = BigNumber.from(block.baseFeePerGas).toBigInt();
  }
  newBlock.blockExtraData = block.extraData;
  if (block.blockGasCost) {
    newBlock.blockGasCost = BigNumber.from(block.blockGasCost).toBigInt();
  }
  newBlock.difficulty = BigNumber.from(block.difficulty).toBigInt();
  newBlock.extDataGasUsed = block.extDataGasUsed;
  newBlock.extDataHash = block.extDataHash;
  newBlock.gasLimit = BigNumber.from(block.gasLimit).toBigInt();
  newBlock.gasUsed = BigNumber.from(block.gasUsed).toBigInt();
  newBlock.hash = block.hash;
  newBlock.logsBloom = block.logsBloom;
  newBlock.miner = block.miner;
  newBlock.mixHash = block.mixHash;
  newBlock.nonce = block.nonce;
  newBlock.number = BigNumber.from(block.number).toNumber();
  newBlock.parentHash = block.parentHash;
  newBlock.receiptsRoot = block.receiptsRoot;
  newBlock.sha3Uncles = block.sha3Uncles;
  newBlock.size = BigNumber.from(block.size).toBigInt();
  newBlock.stateRoot = block.stateRoot;
  newBlock.timestamp = BigNumber.from(block.timestamp).toBigInt();
  newBlock.totalDifficulty = BigNumber.from(block.totalDifficulty).toBigInt();
  newBlock.transactions = block.transactions;
  newBlock.transactionsRoot = block.transactionsRoot;
  newBlock.uncles = block.uncles;
  return newBlock;
}
export function formatLog(
  log: AvalancheLog<AvalancheResult> | AvalancheLog,
): AvalancheLog<AvalancheResult> | AvalancheLog {
  const newLog = {} as AvalancheLog<AvalancheResult>;
  newLog.address = log.address;
  newLog.topics = log.topics;
  newLog.data = log.data;
  newLog.blockNumber = BigNumber.from(log.blockNumber).toNumber();
  newLog.transactionHash = log.transactionHash;
  newLog.transactionIndex = BigNumber.from(log.transactionIndex).toNumber();
  newLog.blockHash = log.blockHash;
  newLog.logIndex = BigNumber.from(log.logIndex).toNumber();
  newLog.removed = log.removed;
  newLog.args = log.args;
  return newLog;
}

export function formatTransaction(
  tx: Record<string, any>,
): AvalancheTransaction {
  const transaction = {} as AvalancheTransaction;
  transaction.blockHash = tx.blockHash;
  transaction.blockNumber = BigNumber.from(tx.blockNumber).toNumber();
  transaction.from = tx.from;
  transaction.gas = BigNumber.from(tx.gas).toBigInt();
  transaction.gasPrice = BigNumber.from(tx.gasPrice).toBigInt();
  transaction.hash = tx.hash;
  transaction.input = tx.input;
  transaction.nonce = BigNumber.from(tx.nonce).toBigInt();
  transaction.to = tx.to;
  transaction.transactionIndex = BigNumber.from(tx.transactionIndex).toBigInt();
  transaction.value = BigNumber.from(tx.value).toBigInt();
  transaction.type = tx.type;
  transaction.v = BigNumber.from(tx.v).toBigInt();
  transaction.r = tx.r;
  transaction.s = tx.s;
  if (tx.accessList) {
    transaction.accessList = tx.accessList;
  }
  if (tx.chainId) {
    transaction.chainId = tx.chainId;
  }
  if (tx.maxFeePerGas) {
    transaction.maxFeePerGas = BigNumber.from(tx.maxFeePerGas).toBigInt();
  }
  if (tx.maxPriorityFeePerGas) {
    transaction.maxPriorityFeePerGas = BigNumber.from(
      tx.maxPriorityFeePerGas,
    ).toBigInt();
  }
  return transaction;
}

export function formatReceipt(receipt: Record<string, any>): AvalancheReceipt {
  const newReceipt = {} as AvalancheReceipt;
  newReceipt.blockHash = receipt.blockHash;
  newReceipt.blockNumber = BigNumber.from(receipt.blockNumber).toNumber();
  newReceipt.contractAddress = receipt.contractAddress;
  newReceipt.cumulativeGasUsed = BigNumber.from(
    receipt.cumulativeGasUsed,
  ).toBigInt();
  newReceipt.effectiveGasPrice = BigNumber.from(
    receipt.effectiveGasPrice,
  ).toBigInt();
  newReceipt.from = receipt.from;
  newReceipt.gasUsed = BigNumber.from(receipt.gasUsed).toBigInt();
  newReceipt.logs = receipt.logs.map((log) => formatLog(log));
  newReceipt.logsBloom = receipt.logsBloom;
  newReceipt.status = Boolean(BigNumber.from(receipt.status).toNumber());
  newReceipt.to = receipt.to;
  newReceipt.transactionHash = receipt.transactionHash;
  newReceipt.transactionIndex = BigNumber.from(
    receipt.transactionIndex,
  ).toNumber();
  newReceipt.type = receipt.type;
  return newReceipt;
}
