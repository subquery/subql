// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  Block,
  BlockTag,
  BlockWithTransactions,
  EventType,
  FeeData,
  Filter,
  Listener,
  Log,
  Provider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/abstract-provider';
import { Network } from '@ethersproject/networks';
import { Deferrable, resolveProperties } from '@ethersproject/properties';
import Avalanche from 'avalanche';
import { EVMAPI } from 'avalanche/dist/apis/evm';
import { BigNumber, BigNumberish } from 'ethers';

function BNishToHex(value: BigNumberish): string {
  return BigNumber.from(value).toHexString();
}

export class CChainProvider implements Provider {
  private api: EVMAPI;

  constructor(
    avalanche: Avalanche,
    private readonly blockHeight: number,
    readonly path = '/ext/bc/C/rpc',
  ) {
    this.api = avalanche.CChain();
  }

  private async resolveHeight(
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<BlockTag> {
    if (!blockTag) return this.blockHeight;

    const resolvedBlockTag = await blockTag;

    if (resolvedBlockTag === 'latest') return this.blockHeight;
    if (typeof resolvedBlockTag === 'number') {
      return Math.min(resolvedBlockTag, this.blockHeight);
    }

    // Will be 'earliest'
    return resolvedBlockTag;
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getNetwork(): Promise<Network> {
    throw new Error('Method not available at specific block heights');
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async getBlockNumber(): Promise<number> {
    return this.blockHeight;
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getGasPrice(): Promise<BigNumber> {
    throw new Error('Method not available at specific block heights');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getFeeData(): Promise<FeeData> {
    throw new Error('Method not available at specific block heights');
  }

  async getBalance(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<BigNumber> {
    const {
      data: { result },
    } = await this.api.callMethod(
      'eth_getBalance',
      [await addressOrName, await this.resolveHeight(blockTag)],
      this.path,
    );

    return BigNumber.from(result);
  }

  async getTransactionCount(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<number> {
    const {
      data: { result },
    } = await this.api.callMethod(
      'eth_getTransactionCount',
      [await addressOrName, await this.resolveHeight(blockTag)],
      this.path,
    );

    return result;
  }
  async getCode(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    const {
      data: { result },
    } = await this.api.callMethod(
      'eth_getCode',
      [await addressOrName, await this.resolveHeight(blockTag)],
      this.path,
    );

    return result;
  }

  async getStorageAt(
    addressOrName: string | Promise<string>,
    position: BigNumberish | Promise<BigNumberish>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    const {
      data: { result },
    } = await this.api.callMethod(
      'eth_getStorageAt',
      [await addressOrName, await position, await this.resolveHeight(blockTag)],
      this.path,
    );

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  sendTransaction(
    signedTransaction: string | Promise<string>,
  ): Promise<TransactionResponse> {
    throw new Error('Method not available at specific block heights');
  }

  async call(
    transaction: Deferrable<TransactionRequest>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    const tx = await resolveProperties(transaction);

    const {
      data: { result },
    } = await this.api.callMethod(
      'eth_getStorageAt',
      [
        {
          ...tx,
          nonce: tx.nonce && BNishToHex(tx.nonce),
          gas: tx.gasLimit && BNishToHex(tx.gasLimit),
          gasPrice: tx.gasPrice && BNishToHex(tx.gasPrice),
          value: tx.value && BNishToHex(tx.value),
          data: tx.data,
        },
        await this.resolveHeight(blockTag),
      ],
      this.path,
    );

    return result;
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  estimateGas(transaction: Deferrable<TransactionRequest>): Promise<BigNumber> {
    throw new Error('Method not available at specific block heights');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlock(blockHashOrBlockTag: BlockTag | Promise<BlockTag>): Promise<Block> {
    throw new Error('Method not available at specific block heights');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlockWithTransactions(
    blockHashOrBlockTag: BlockTag | Promise<BlockTag>,
  ): Promise<BlockWithTransactions> {
    throw new Error('Method not available at specific block heights');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getTransaction(transactionHash: string): Promise<TransactionResponse> {
    throw new Error('Method not available at specific block heights');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt> {
    throw new Error('Method not available at specific block heights');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getLogs(filter: Filter): Promise<Log[]> {
    throw new Error('Method not available at specific block heights');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  resolveName(name: string | Promise<string>): Promise<string> {
    throw new Error('Method not available at specific block heights');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  lookupAddress(address: string | Promise<string>): Promise<string> {
    throw new Error('Method not available at specific block heights');
  }
  on(eventName: EventType, listener: Listener): Provider {
    throw new Error('Method not available at specific block heights');
  }
  once(eventName: EventType, listener: Listener): Provider {
    throw new Error('Method not available at specific block heights');
  }
  emit(eventName: EventType, ...args: any[]): boolean {
    throw new Error('Method not available at specific block heights');
  }
  listenerCount(eventName?: EventType): number {
    throw new Error('Method not available at specific block heights');
  }
  listeners(eventName?: EventType): Listener[] {
    throw new Error('Method not available at specific block heights');
  }
  off(eventName: EventType, listener?: Listener): Provider {
    throw new Error('Method not available at specific block heights');
  }
  removeAllListeners(eventName?: EventType): Provider {
    throw new Error('Method not available at specific block heights');
  }
  addListener(eventName: EventType, listener: Listener): Provider {
    throw new Error('Method not available at specific block heights');
  }
  removeListener(eventName: EventType, listener: Listener): Provider {
    throw new Error('Method not available at specific block heights');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number,
  ): Promise<TransactionReceipt> {
    throw new Error('Method not available at specific block heights');
  }
  _isProvider: boolean;
}
