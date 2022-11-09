// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import http from 'http';
import https from 'https';
import { Interface } from '@ethersproject/abi';
import { Block, TransactionReceipt } from '@ethersproject/abstract-provider';
import { JsonRpcProvider, WebSocketProvider } from '@ethersproject/providers';
import { RuntimeDataSourceV0_2_0 } from '@subql/common-ethereum';
import { delay, getLogger, retryOnFailAxios } from '@subql/node-core';
import {
  ApiWrapper,
  BlockWrapper,
  EthereumBlockWrapper,
  EthereumTransaction,
  EthereumResult,
  EthereumLog,
} from '@subql/types-ethereum';
import { ConnectionInfo, hexDataSlice, hexValue } from 'ethers/lib/utils';
import { EthereumBlockWrapped } from './block.ethereum';
import {
  formatBlock,
  formatReceipt,
  formatTransaction,
} from './utils.ethereum';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const logger = getLogger('api.ethereum');

async function loadAssets(
  ds: RuntimeDataSourceV0_2_0,
): Promise<Record<string, string>> {
  if (!ds.assets) {
    return {};
  }
  const res: Record<string, string> = {};

  for (const [name, { file }] of Object.entries(ds.assets)) {
    try {
      res[name] = await fs.promises.readFile(file, { encoding: 'utf8' });
    } catch (e) {
      throw new Error(`Failed to load datasource asset ${file}`);
    }
  }

  return res;
}

export class EthereumApi implements ApiWrapper<EthereumBlockWrapper> {
  private client: JsonRpcProvider;
  private genesisBlock: Record<string, any>;
  private contractInterfaces: Record<string, Interface> = {};
  private chainId: number;

  constructor(private endpoint: string) {
    const { hostname, pathname, port, protocol, searchParams } = new URL(
      endpoint,
    );

    const protocolStr = protocol.replace(':', '');

    if (protocolStr === 'https' || protocolStr === 'http') {
      const connection: ConnectionInfo = {
        url: this.endpoint,
        headers: {
          'User-Agent': `Subquery-Node ${packageVersion}`,
        },
      };
      if ((searchParams as any).apiKey) {
        (connection.headers as any).apiKey = searchParams.get('apiKey');
      }
      this.client = new JsonRpcProvider(connection);
    } else if (protocolStr === 'ws' || protocolStr === 'wss') {
      this.client = new WebSocketProvider(this.endpoint);
    } else {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  async init(): Promise<void> {
    this.genesisBlock = await this.client.getBlock(0);

    this.chainId = (await this.client.getNetwork()).chainId;
  }

  async getLastHeight(): Promise<number> {
    return this.client.getBlockNumber();
  }

  getRuntimeChain(): string {
    return 'ethereum';
  }

  getChainId(): number {
    return this.chainId;
  }

  getGenesisHash(): string {
    return this.genesisBlock.hash;
  }

  getSpecName(): string {
    return 'ethereum';
  }

  async getFinalizedBlockHeight(): Promise<number> {
    // Doesn't seem to be a difference between finalized and latest
    return this.client.getBlockNumber();
  }

  async getBlockByHeight(height: number): Promise<Block> {
    return this.client.getBlock(height);
  }

  async getBlockPromise(num: number): Promise<any> {
    try {
      const result = await retryOnFailAxios(
        this.client.send.bind(this, 'eth_getBlockByNumber', [
          hexValue(num),
          true,
        ]),
        [429],
      );
      return result;
    } catch (e) {
      logger.error(`Failed to fetch block_promise ${num}`);
      throw e;
    }
  }

  async getTransactionReceipt(
    transactionHash: string | Promise<string>,
  ): Promise<TransactionReceipt> {
    try {
      return await retryOnFailAxios(
        this.client.getTransactionReceipt.bind(this, transactionHash),
        [429],
      );
    } catch (e) {
      logger.error(`Failed to fetch TransactionReceipt ${transactionHash}`);
      throw e;
    }
  }
  async fetchBlock(num: number): Promise<EthereumBlockWrapper> {
    try {
      const block_promise = await this.getBlockPromise(num);

      const block = formatBlock(block_promise);
      block.stateRoot = this.client.formatter.hash(block.stateRoot);

      const transactions = await Promise.all(
        block.transactions.map(async (tx) => {
          const transaction = formatTransaction(tx);
          const receipt = await this.getTransactionReceipt(tx.hash);
          transaction.receipt = formatReceipt(receipt, block);
          return transaction;
        }),
      );
      return new EthereumBlockWrapped(block, transactions);
    } catch (e) {
      logger.error('Failed to fetch block');
      throw e;
    }
  }

  async fetchBlocks(bufferBlocks: number[]): Promise<EthereumBlockWrapper[]> {
    return Promise.all(
      bufferBlocks.map(async (num) => {
        try {
          // Fetch Block
          return this.fetchBlock(num);
        } catch (e) {
          // Wrap error from an axios error to fix issue with error being undefined
          const error = new Error(e.message);
          logger.error(error, `Failed to fetch block at height ${num}`);
          throw error;
        }
      }),
    );
  }

  freezeApi(processor: any, blockContent: BlockWrapper): void {
    processor.freeze(this.client, 'api');
  }

  private buildInterface(
    abiName: string,
    assets: Record<string, string>,
  ): Interface | undefined {
    if (!assets[abiName]) {
      throw new Error(`ABI named "${abiName}" not referenced in assets`);
    }

    // This assumes that all datasources have a different abi name or they are the same abi
    if (!this.contractInterfaces[abiName]) {
      // Constructing the interface validates the ABI
      try {
        let abiObj = JSON.parse(assets[abiName]);

        /*
         * Allows parsing JSON artifacts as well as ABIs
         * https://trufflesuite.github.io/artifact-updates/background.html#what-are-artifacts
         */
        if (!Array.isArray(abiObj) && abiObj.abi) {
          abiObj = abiObj.abi;
        }

        this.contractInterfaces[abiName] = new Interface(abiObj);
      } catch (e) {
        logger.error(`Unable to parse ABI: ${e.message}`);
        throw new Error('ABI is invalid');
      }
    }

    return this.contractInterfaces[abiName];
  }

  async parseLog<T extends EthereumResult = EthereumResult>(
    log: EthereumLog,
    ds: RuntimeDataSourceV0_2_0,
  ): Promise<EthereumLog<T> | EthereumLog> {
    try {
      if (!ds?.options?.abi) {
        logger.warn('No ABI provided for datasource');
        return log;
      }
      const iface = this.buildInterface(ds.options.abi, await loadAssets(ds));
      return {
        ...log,
        args: iface?.parseLog(log).args as T,
      };
    } catch (e) {
      logger.warn(`Failed to parse log data: ${e.message}`);
      return log;
    }
  }

  async parseTransaction<T extends EthereumResult = EthereumResult>(
    transaction: EthereumTransaction,
    ds: RuntimeDataSourceV0_2_0,
  ): Promise<EthereumTransaction<T> | EthereumTransaction> {
    try {
      if (!ds?.options?.abi) {
        logger.warn('No ABI provided for datasource');
        return transaction;
      }
      const assets = await loadAssets(ds);
      const iface = this.buildInterface(ds.options.abi, assets);
      const func = iface.getFunction(hexDataSlice(transaction.input, 0, 4));
      const args = iface.decodeFunctionData(func, transaction.input) as T;
      return {
        ...transaction,
        args,
      };
    } catch (e) {
      logger.warn(`Failed to parse transaction data: ${e.message}`);
      return transaction;
    }
  }
}
