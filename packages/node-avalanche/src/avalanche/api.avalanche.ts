// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import fs from 'fs';
import url from 'url';
import { Interface } from '@ethersproject/abi';
import { hexDataSlice } from '@ethersproject/bytes';
import { RuntimeDataSourceV0_2_0 } from '@subql/common-avalanche';
import { getLogger } from '@subql/node-core';
import {
  ApiWrapper,
  AvalancheLog,
  AvalancheBlockWrapper,
  AvalancheTransaction,
  AvalancheResult,
} from '@subql/types-avalanche';
import { Avalanche } from 'avalanche';
import { EVMAPI } from 'avalanche/dist/apis/evm';
import { IndexAPI } from 'avalanche/dist/apis/index';
import { AvalancheBlockWrapped } from './block.avalanche';
import { AvalancheProvider } from './provider.avalanche';
import {
  formatBlock,
  formatReceipt,
  formatTransaction,
} from './utils.avalanche';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

type AvalancheOptions = {
  endpoint?: string;
  token?: string;
  chainId: string; //'XV' | 'XT' | 'C' | 'P';
  subnet: string;
};

const logger = getLogger('api.avalanche');

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

export class AvalancheApi implements ApiWrapper<AvalancheBlockWrapper> {
  private client: Avalanche;
  private indexApi: IndexAPI;
  private genesisBlock: Record<string, any>;
  private encoding: string;
  private baseUrl: string;
  private cchain: EVMAPI;
  private contractInterfaces: Record<string, Interface> = {};
  private chainId: string;
  private provider: AvalancheProvider;

  constructor(private options: AvalancheOptions) {
    this.encoding = 'cb58';

    assert(options.endpoint, 'Network endpoint not provided');

    const { hostname, port, protocol } = url.parse(options.endpoint);

    const protocolStr = protocol.replace(':', '');
    const portNum = port
      ? parseInt(port, 10)
      : protocolStr === 'https'
      ? undefined
      : 9650;

    this.client = new Avalanche(hostname, portNum, protocolStr);
    if (this.options.token) {
      this.client.setAuthToken(this.options.token);
    }
    this.indexApi = this.client.Index();
    this.cchain = this.client.CChain();
    this.provider = new AvalancheProvider(this.cchain);
    switch (this.options.subnet) {
      case 'XV':
        this.baseUrl = '/ext/index/X/vtx';
        break;
      case 'XT':
        this.baseUrl = '/ext/index/X/tx';
        break;
      case 'C':
        this.baseUrl = '/ext/index/C/block';
        break;
      case 'P':
        this.baseUrl = '/ext/index/P/block';
        break;
      default:
        break;
    }
  }

  async init(): Promise<void> {
    this.chainId = await this.client.Info().getNetworkName();

    this.client.setHeader('User-Agent', `SubQuery-Node ${packageVersion}`);

    this.genesisBlock = (
      await this.cchain.callMethod(
        'eth_getBlockByNumber',
        ['0x0', true],
        '/ext/bc/C/rpc',
      )
    ).data.result;
  }

  getChainId(): string {
    return this.chainId;
  }

  getGenesisHash(): string {
    return this.genesisBlock.hash;
  }

  getRuntimeChain(): string /*'XV' | 'XT' | 'C' | 'P'*/ {
    return this.options.chainId;
  }

  getSpecName(): string {
    return 'avalanche';
  }

  async getFinalizedBlockHeight(): Promise<number> {
    const lastAccepted = await this.indexApi.getLastAccepted(
      this.encoding,
      this.baseUrl,
    );
    const finalizedBlockHeight = parseInt(lastAccepted.index);
    return finalizedBlockHeight;
  }

  async getLastHeight(): Promise<number> {
    const lastAccepted = await this.indexApi.getLastAccepted(
      this.encoding,
      this.baseUrl,
    );
    const lastHeight = parseInt(lastAccepted.index);
    return lastHeight;
  }

  async getBalance(address: string): Promise<any> {
    const rep = await this.provider.getBalance(address);
    return rep;
  }

  async getTransactionCount(address: string): Promise<any> {
    const rep = await this.provider.getTransactionCount(address);
    return rep;
  }

  async getCode(address: string): Promise<any> {
    const rep = await this.provider.getCode(address);
    return rep;
  }

  async getStorageAt(address: string, position: string): Promise<any> {
    const rep = await this.provider.getStorageAt(address, position);
    return rep;
  }

  async fetchBlocks(bufferBlocks: number[]): Promise<AvalancheBlockWrapper[]> {
    return Promise.all(
      bufferBlocks.map(async (num) => {
        // Fetch Block
        const block_promise = await this.cchain.callMethod(
          'eth_getBlockByNumber',
          [`0x${num.toString(16)}`, true],
          '/ext/bc/C/rpc',
        );

        const block = formatBlock(block_promise.data.result);

        block.transactions = await Promise.all(
          block.transactions.map(async (tx) => {
            const transaction = formatTransaction(tx, this.provider);
            const receipt = (
              await this.cchain.callMethod(
                'eth_getTransactionReceipt',
                [tx.hash],
                '/ext/bc/C/rpc',
              )
            ).data.result;
            transaction.receipt = formatReceipt(receipt, block, this.provider);
            return transaction;
          }),
        );
        return new AvalancheBlockWrapped(block, this.provider);
      }),
    );
  }

  freezeApi(processor: any): void {
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

  async parseLog<T extends AvalancheResult = AvalancheResult>(
    log: AvalancheLog,
    ds: RuntimeDataSourceV0_2_0,
  ): Promise<AvalancheLog<T> | AvalancheLog> {
    try {
      if (!ds?.options?.abi) {
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

  async parseTransaction<T extends AvalancheResult = AvalancheResult>(
    transaction: AvalancheTransaction,
    ds: RuntimeDataSourceV0_2_0,
  ): Promise<AvalancheTransaction<T> | AvalancheTransaction> {
    try {
      if (!ds?.options?.abi) {
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
