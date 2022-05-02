// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Interface } from '@ethersproject/abi';
import { hexDataSlice } from '@ethersproject/bytes';
import {
  isRuntimeDataSourceV0_3_0,
  RuntimeDataSourceV0_3_0,
} from '@subql/common-avalanche';
import { getLogger } from '@subql/common-node';
import {
  ApiWrapper,
  AvalancheBlock,
  AvalancheEvent,
  AvalancheBlockWrapper,
  AvalancheTransaction,
  AvalancheEventFilter,
  AvalancheCallFilter,
  AvalancheResult,
  SubqlDatasource,
} from '@subql/types';
import { Avalanche } from 'avalanche';
import { EVMAPI } from 'avalanche/dist/apis/evm';
import { IndexAPI } from 'avalanche/dist/apis/index';
import { eventToTopic, functionToSighash, hexStringEq, stringNormalizedEq } from '../utils/string';

type AvalancheOptions = {
  ip: string;
  port: number;
  token: string;
  chainName: string; // XV | XT | C | P
};

const logger = getLogger('api.avalanche');

async function loadAssets(
  ds: RuntimeDataSourceV0_3_0,
): Promise<Record<string, string>> {
  if (!ds.assets) {
    return {};
  }

  const res: Record<string, string> = {};

  for (const [name, { file }] of ds.assets) {
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

  constructor(private options: AvalancheOptions) {
    this.encoding = 'cb58';
    this.client = new Avalanche(this.options.ip, this.options.port, 'http');
    this.client.setAuthToken(this.options.token);
    this.indexApi = this.client.Index();
    this.cchain = this.client.CChain();
    switch (this.options.chainName) {
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
    this.genesisBlock = (
      await this.cchain.callMethod(
        'eth_getBlockByNumber',
        ['0x0', true],
        '/ext/bc/C/rpc',
      )
    ).data.result;
  }

  getGenesisHash(): string {
    return this.genesisBlock.hash;
  }

  getRuntimeChain(): string {
    return this.options.chainName;
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

  async fetchBlocks(bufferBlocks: number[]): Promise<AvalancheBlockWrapper[]> {
    return Promise.all(
      bufferBlocks.map(async (num) => {
        const block_promise = this.cchain.callMethod(
          'eth_getBlockByNumber',
          [`0x${num.toString(16)}`, true],
          '/ext/bc/C/rpc',
        );
        const logs_promise = this.cchain.callMethod(
          'eth_getLogs',
          [
            {
              fromBlock: `0x${num.toString(16)}`,
              toBlock: `0x${num.toString(16)}`,
            },
          ],
          '/ext/bc/C/rpc',
        );
        return new AvalancheBlockWrapped(
          (await block_promise).data.result,
          (await logs_promise).data.result,
        );
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

   parseEvent<T extends AvalancheResult = AvalancheResult>(
    event: AvalancheEvent,
  ): AvalancheEvent<T> {
        return event as AvalancheEvent<T>;
    }
  parseTransaction<T extends AvalancheResult = AvalancheResult>(
    transaction: AvalancheTransaction,
  ): AvalancheTransaction<T> {
        return transaction as AvalancheTransaction<T>;
  }
}

export class AvalancheBlockWrapped implements AvalancheBlockWrapper {
  constructor(
    private _block: AvalancheBlock,
    private _logs: AvalancheEvent[],
  ) {}

  get block(): AvalancheBlock {
    return this._block;
  }

  get blockHeight(): number {
    return parseInt(this.block.number);
  }

  get hash(): string {
    return this.block.hash;
  }

  calls(
    filter?: AvalancheCallFilter,
  ): AvalancheTransaction[] {
    if (!filter) {
      return this.block.transactions;
    }

    return this.block.transactions.filter((t) =>
      this.filterCallProcessor(t, filter),
    );
  }

  events(
    filter?: AvalancheEventFilter,
  ): AvalancheEvent[] {
    if (!filter) {
      return this._logs;
    }

    return this._logs.filter((log) =>
      this.filterEventsProcessor(log, filter),
    );
  }

  private filterCallProcessor(
    transaction: AvalancheTransaction,
    filter: AvalancheCallFilter,
  ): boolean {
    if (filter.to && !stringNormalizedEq(filter.to, transaction.to)) {
      return false;
    }
    if (filter.from && !stringNormalizedEq(filter.from, transaction.from)) {
      return false;
    }

    if (
      filter.function &&
      transaction.input.indexOf(functionToSighash(filter.function)) !== 0
    ) {
      return false;
    }

    return true;
  }

  private filterEventsProcessor(
    log: AvalancheEvent,
    filter: AvalancheEventFilter,
  ): boolean {
    if (filter.topics) {
      for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
        const topic = filter.topics[i];
        if (!topic) {
          continue;
        }

        if (!hexStringEq(eventToTopic(topic), log.topics[i])) {
          return false;
        }
      }
    }
    return true;
  }

  /****************************************************/
  /*           AVALANCHE SPECIFIC METHODS             */
  /****************************************************/

  getTransactions(filters?: string[]): Record<string, any> {
    if (!filters) {
      return this.block.transactions;
    }
    return this.block.transactions.map((trx) => {
      const filteredTrx = {};
      filters.forEach((filter) => {
        filteredTrx[filter] = trx[filter];
      });
      return filteredTrx;
    });
  }
}
