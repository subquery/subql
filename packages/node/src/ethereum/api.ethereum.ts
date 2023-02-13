// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import fs from 'fs';
import { Interface } from '@ethersproject/abi';
import { Block, TransactionReceipt } from '@ethersproject/abstract-provider';
import { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcProvider, WebSocketProvider } from '@ethersproject/providers';
import { RuntimeDataSourceV0_2_0 } from '@subql/common-ethereum';
import { getLogger } from '@subql/node-core';
import {
  ApiWrapper,
  BlockWrapper,
  EthereumBlockWrapper,
  EthereumTransaction,
  EthereumResult,
  EthereumLog,
} from '@subql/types-ethereum';
import { ConnectionInfo, hexDataSlice, hexValue } from 'ethers/lib/utils';
import { retryOnFailEth } from '../utils/project';
import { EthereumBlockWrapped } from './block.ethereum';
import SafeEthProvider from './safe-api';
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

  private endpointSupportsGetBlockReceipts = true;

  constructor(private endpoint: string) {
    const { hostname, pathname, port, protocol, searchParams } = new URL(
      endpoint,
    );

    const protocolStr = protocol.replace(':', '');

    logger.info(this.endpoint.split('?')[0]);
    if (protocolStr === 'https' || protocolStr === 'http') {
      const connection: ConnectionInfo = {
        url: this.endpoint.split('?')[0],
        headers: {
          'User-Agent': `Subquery-Node ${packageVersion}`,
        },
      };
      searchParams.forEach((value, name, searchParams) => {
        (connection.headers as any)[name] = value;
      });
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

  async getFinalizedBlockHeight(): Promise<number> {
    return (await this.client.getBlock('finalized')).number;
  }

  async getBestBlockHeight(): Promise<number> {
    return (await this.client.getBlock('safe')).number;
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

  async getBlockByHeightOrHash(heightOrHash: number | string): Promise<Block> {
    return this.client.getBlock(heightOrHash);
  }

  async getBlockPromise(num: number): Promise<any> {
    return retryOnFailEth(() =>
      this.client.send('eth_getBlockByNumber', [hexValue(num), true]),
    );
  }

  async getTransactionReceipt(
    transactionHash: string | Promise<string>,
  ): Promise<TransactionReceipt> {
    return retryOnFailEth<TransactionReceipt>(
      this.client.getTransactionReceipt.bind(this.client, transactionHash),
    );
  }
  async fetchBlock(num: number): Promise<EthereumBlockWrapper> {
    const block_promise = await this.getBlockPromise(num);

    const block = formatBlock(block_promise);
    block.stateRoot = this.client.formatter.hash(block.stateRoot);

    if (this.endpointSupportsGetBlockReceipts) {
      try {
        const rawReceipts: any[] = await this.client.send(
          'eth_getBlockReceipts',
          [hexValue(block.number)],
        );

        const receipts = rawReceipts.map((receipt) =>
          formatReceipt(receipt, block),
        );

        const txs = block.transactions.map((tx) => {
          const transaction = formatTransaction(tx);
          transaction.receipt =
            receipts[BigNumber.from(transaction.transactionIndex).toNumber()];

          assert(
            transaction.hash === transaction.receipt.transactionHash,
            'Failed to match receipt to transaction',
          );

          return transaction;
        });

        return new EthereumBlockWrapped(block, txs);
      } catch (e) {
        // Method not avaialble https://eips.ethereum.org/EIPS/eip-1474
        if (e?.error?.code === -32601) {
          logger.warn(
            `The endpoint doesn't support 'eth_getBlockReceipts', individual receipts will be fetched instead, this will greatly impact performance.`,
          );
          this.endpointSupportsGetBlockReceipts = false;

          // Should continue and use old method here
        } else {
          throw e;
        }
      }
    }

    const transactions = await Promise.all(
      block.transactions.map(async (tx) => {
        const transaction = formatTransaction(tx);
        const receipt = await this.getTransactionReceipt(tx.hash);
        transaction.receipt = formatReceipt(receipt, block);
        return transaction;
      }),
    );
    return new EthereumBlockWrapped(block, transactions);
  }

  async fetchBlocks(bufferBlocks: number[]): Promise<EthereumBlockWrapper[]> {
    return Promise.all(
      bufferBlocks.map(async (num) => {
        try {
          // Fetch Block
          return await this.fetchBlock(num);
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
    processor.freeze(
      new SafeEthProvider(this.client, blockContent.blockHeight),
      'api',
    );
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
