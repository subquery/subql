// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { Zero } from '@ethersproject/constants';
import {
  ApiWrapper,
  EthereumBlock,
  EthereumLog,
  EthereumReceipt,
  EthereumResult,
  EthereumTransaction,
} from '@subql/types-ethereum';
import { omit } from 'lodash';

export function calcInterval(api: ApiWrapper): number {
  // TODO find a way to get this from the blockchain
  return 6000;
}

function handleAddress(value: string): string | null {
  if (!value || value === '0x') {
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
  if (value === null) {
    return Zero;
  }
  return BigNumber.from(value);
}

export function formatBlock(block: Record<string, any>): EthereumBlock {
  return {
    ...block,
    difficulty: handleNumber(block.difficulty).toBigInt(),
    gasLimit: handleNumber(block.gasLimit).toBigInt(),
    gasUsed: handleNumber(block.gasUsed).toBigInt(),
    number: handleNumber(block.number).toNumber(),
    size: handleNumber(block.size).toBigInt(),
    timestamp: handleNumber(block.timestamp).toBigInt(),
    totalDifficulty: handleNumber(block.totalDifficulty).toBigInt(),
    baseFeePerGas: block.baseFeePerGas
      ? handleNumber(block.baseFeePerGas).toBigInt()
      : undefined,
    blockGasCost: block.blockGasCost
      ? handleNumber(block.blockGasCost).toBigInt()
      : undefined,
    logs: [], // Filled in at AvalancheBlockWrapped constructor
  } as EthereumBlock;
}
export function formatLog(
  log: Omit<
    EthereumLog<EthereumResult> | EthereumLog,
    'blockTimestamp' | 'block' | 'transaction'
  >,
  block: EthereumBlock,
): EthereumLog<EthereumResult> | EthereumLog {
  const formattedLog = {
    ...log,
    address: handleAddress(log.address),
    blockNumber: handleNumber(log.blockNumber).toNumber(),
    transactionIndex: handleNumber(log.transactionIndex).toNumber(),
    logIndex: handleNumber(log.logIndex).toNumber(),
    block,
    toJSON(): string {
      return JSON.stringify(omit(this, ['transaction', 'block', 'toJSON']));
    },
  };

  // Define this afterwards as the spread on `...log` breaks defining a getter
  Object.defineProperty(formattedLog, 'transaction', {
    get: () => {
      const rawTransaction = block.transactions?.find(
        (tx) => tx.hash === log.transactionHash,
      );

      return rawTransaction;
    },
  });
  return formattedLog as unknown as EthereumLog<EthereumResult>;
}

export function formatTransaction(
  tx: Record<string, any>,
  block: EthereumBlock,
): EthereumTransaction {
  return {
    ...(tx as Partial<EthereumTransaction>),
    from: handleAddress(tx.from),
    to: handleAddress(tx.to),
    blockNumber: handleNumber(tx.blockNumber).toNumber(),
    blockTimestamp: block.timestamp,
    gas: handleNumber(tx.gas).toBigInt(),
    gasPrice: handleNumber(tx.gasPrice).toBigInt(),
    nonce: handleNumber(tx.nonce).toBigInt(),
    transactionIndex: handleNumber(tx.transactionIndex).toBigInt(),
    value: handleNumber(tx.value).toBigInt(),
    v: handleNumber(tx.v).toBigInt(),
    maxFeePerGas: tx.maxFeePerGas
      ? handleNumber(tx.maxFeePerGas).toBigInt()
      : undefined,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? handleNumber(tx.maxPriorityFeePerGas).toBigInt()
      : undefined,
    receipt: undefined, // Filled in at AvalancheApi.fetchBlocks
    toJSON(): string {
      return JSON.stringify(omit(this, ['block', 'receipt', 'toJSON']));
    },
  } as EthereumTransaction;
}

export function formatReceipt<R extends EthereumReceipt = EthereumReceipt>(
  receipt: Record<string, any>,
  block: EthereumBlock,
): R {
  return {
    ...receipt,
    from: handleAddress(receipt.from),
    to: handleAddress(receipt.to),
    blockNumber: handleNumber(receipt.blockNumber).toNumber(),
    cumulativeGasUsed: handleNumber(receipt.cumulativeGasUsed).toBigInt(),
    effectiveGasPrice: handleNumber(receipt.effectiveGasPrice).toBigInt(),
    gasUsed: handleNumber(receipt.gasUsed).toBigInt(),
    logs: receipt.logs.map(formatLog),
    status: Boolean(handleNumber(receipt.status).toNumber()),
    transactionIndex: handleNumber(receipt.transactionIndex).toNumber(),
    toJSON(): string {
      return JSON.stringify(omit(this, ['toJSON']));
    },
  } as unknown as R;
}
