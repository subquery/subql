// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  Block,
  BlockTag,
  BlockWithTransactions,
  EventType,
  Filter,
  Listener,
  Log,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
  Provider,
} from '@ethersproject/abstract-provider';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import type { Network } from '@ethersproject/networks';
import type { Deferrable } from '@ethersproject/properties';
import { getLogger } from '@subql/node-core';

const logger = getLogger('safe.api.ethereum');

export default class SafeEthProvider extends Provider {
  private network?: Network;
  constructor(
    private baseApi: Provider,
    private blockHeight: BlockTag | Promise<BlockTag>,
  ) {
    super();
  }

  async getBalance(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<BigNumber> {
    if (blockTag) logger.warn(`Provided parameter 'blockTag' will not be used`);
    return this.baseApi.getBalance(addressOrName, this.blockHeight);
  }

  async getTransactionCount(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<number> {
    if (blockTag) logger.warn(`Provided parameter 'blockTag' will not be used`);
    return this.baseApi.getTransactionCount(addressOrName, this.blockHeight);
  }

  async getCode(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    if (blockTag) logger.warn(`Provided parameter 'blockTag' will not be used`);
    return this.baseApi.getCode(addressOrName, this.blockHeight);
  }

  async getStorageAt(
    addressOrName: string | Promise<string>,
    position: BigNumberish | Promise<BigNumberish>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    if (blockTag) logger.warn(`Provided parameter 'blockTag' will not be used`);
    return this.baseApi.getStorageAt(addressOrName, position, this.blockHeight);
  }

  async call(
    transaction: Deferrable<TransactionRequest>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    if (blockTag) logger.warn(`Provided parameter 'blockTag' will not be used`);

    return this.baseApi.call(transaction, this.blockHeight);
  }

  async getNetwork(): Promise<Network> {
    if (!this.network) {
      this.network = await this.baseApi.getNetwork();
    }
    return this.network;
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlockWithTransactions(
    blockHashOrBlockTag: BlockTag | Promise<BlockTag>,
  ): Promise<BlockWithTransactions> {
    throw new Error('Method `getBlockWithTransactions` not supported.');
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlock(blockHashOrBlockTag: BlockTag | Promise<BlockTag>): Promise<Block> {
    throw new Error('Method `getBlock` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getTransaction(transactionHash: string): Promise<TransactionResponse> {
    throw new Error('Method `getTransaction` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt> {
    throw new Error('Method `getTransactionReceipt` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getLogs(filter: Filter): Promise<Log[]> {
    throw new Error('Method `getLogs` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlockNumber(): Promise<number> {
    throw new Error('Method `getBlockNumber` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getGasPrice(): Promise<BigNumber> {
    throw new Error('Method `getGasPrice` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  estimateGas(transaction: Deferrable<TransactionRequest>): Promise<BigNumber> {
    throw new Error('Method `estimateGas` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  sendTransaction(
    signedTransaction: string | Promise<string>,
  ): Promise<TransactionResponse> {
    throw new Error('Method `sendTransaction` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  resolveName(name: string | Promise<string>): Promise<string | null> {
    throw new Error('Method `resolveName` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  lookupAddress(address: string | Promise<string>): Promise<string | null> {
    throw new Error('Method `lookupAddress` not supported.');
  }
  on(eventName: EventType, listener: Listener): Provider {
    throw new Error('Method `on` not supported.');
  }
  once(eventName: EventType, listener: Listener): Provider {
    throw new Error('Method `once` not supported.');
  }
  emit(eventName: EventType, ...args: any[]): boolean {
    throw new Error('Method `emit` not supported.');
  }
  listenerCount(eventName?: EventType): number {
    throw new Error('Method `listenerCount` not supported.');
  }
  listeners(eventName?: EventType): Listener[] {
    throw new Error('Method `listeners` not supported.');
  }
  off(eventName: EventType, listener?: Listener): Provider {
    throw new Error('Method `off` not supported.');
  }
  removeAllListeners(eventName?: EventType): Provider {
    throw new Error('Method `removeAllListeners` not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number,
  ): Promise<TransactionReceipt> {
    throw new Error('Method `waitForTransaction` not supported.');
  }
}
