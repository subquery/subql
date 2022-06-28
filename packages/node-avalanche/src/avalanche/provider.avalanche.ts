// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  Block,
  BlockTag,
  BlockWithTransactions,
  EventType,
  Filter,
  Listener,
  Log,
  Provider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/abstract-provider';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Network } from '@ethersproject/networks';
import { Deferrable, resolveProperties } from '@ethersproject/properties';
import { AvalancheProvider as AvProv } from '@subql/types-avalanche';
import { EVMAPI } from 'avalanche/dist/apis/evm';

export class AvalancheProvider extends Provider implements AvProv {
  constructor(private cchain: EVMAPI) {
    super();
  }

  async getBalance(address: string): Promise<any> {
    const rep = (
      await this.cchain.callMethod(
        'eth_getBalance',
        [address, 'latest'],
        '/ext/bc/C/rpc',
      )
    ).data.result;
    return rep;
  }

  async getTransactionCount(address: string): Promise<any> {
    const rep = (
      await this.cchain.callMethod(
        'eth_getTransactionCount',
        [address, 'latest'],
        '/ext/bc/C/rpc',
      )
    ).data.result;
    return rep;
  }

  async getCode(address: string): Promise<any> {
    const rep = (
      await this.cchain.callMethod(
        'eth_getCode',
        [address, 'latest'],
        '/ext/bc/C/rpc',
      )
    ).data.result;
    return rep;
  }

  async getStorageAt(address: string, position: string): Promise<any> {
    const rep = (
      await this.cchain.callMethod(
        'eth_getStorageAt',
        [address, position, 'latest'],
        '/ext/bc/C/rpc',
      )
    ).data.result;
    return rep;
  }

  async call(
    transaction: Deferrable<TransactionRequest>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<string> {
    const tx = await resolveProperties(transaction);
    const rep = (
      await this.cchain.callMethod(
        'eth_call',
        [
          {
            ...tx,
            nonce: tx.nonce,
            gas: tx.gasLimit,
            gasPrice: tx.gasPrice,
            value: tx.value,
            data: tx.data,
          },
          'latest',
        ],
        '/ext/bc/C/rpc',
      )
    ).data.result;
    return rep;
  }

  async getBlockWithTransactions(
    blockHashOrBlockTag: BlockTag | Promise<BlockTag>,
  ): Promise<BlockWithTransactions> {
    const raw = (
      await this.cchain.callMethod('eth_getBlockByHash', [
        blockHashOrBlockTag.toString(),
        true,
      ])
    ).data.result;

    return {
      ...raw,
      transactions: raw.transactions.toArray(),
    };
  }

  async getBlock(
    blockHashOrBlockTag: BlockTag | Promise<BlockTag>,
  ): Promise<Block> {
    await Promise.resolve(null);
    throw new Error('Method `getBlock` not supported.');
  }
  async getTransaction(transactionHash: string): Promise<TransactionResponse> {
    await Promise.resolve(null);
    throw new Error('Method `getTransaction` not supported.');
  }
  async getTransactionReceipt(
    transactionHash: string,
  ): Promise<TransactionReceipt> {
    await Promise.resolve(null);
    throw new Error('Method `getTransactionReceipt` not supported.');
  }
  async getLogs(filter: Filter): Promise<Log[]> {
    await Promise.resolve(null);
    throw new Error('Method `getLogs` not supported.');
  }
  async getBlockNumber(): Promise<number> {
    await Promise.resolve(null);
    throw new Error('Method `getBlockNumber` not supported.');
  }
  async getNetwork(): Promise<Network> {
    await Promise.resolve(null);
    throw new Error('Method `getNetwork` not supported.');
  }
  async getGasPrice(): Promise<BigNumber> {
    await Promise.resolve(null);
    throw new Error('Method `getGasPrice` not supported.');
  }
  async estimateGas(
    transaction: Deferrable<TransactionRequest>,
  ): Promise<BigNumber> {
    await Promise.resolve(null);
    throw new Error('Method `estimateGas` not supported.');
  }
  async sendTransaction(
    signedTransaction: string | Promise<string>,
  ): Promise<TransactionResponse> {
    await Promise.resolve(null);
    throw new Error('Method `sendTransaction` not supported.');
  }
  async resolveName(name: string | Promise<string>): Promise<string | null> {
    await Promise.resolve(null);
    throw new Error('Method `resolveName` not supported.');
  }
  async lookupAddress(
    address: string | Promise<string>,
  ): Promise<string | null> {
    await Promise.resolve(null);
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
  async waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number,
  ): Promise<TransactionReceipt> {
    await Promise.resolve(null);
    throw new Error('Method `waitForTransaction` not supported.');
  }
}
