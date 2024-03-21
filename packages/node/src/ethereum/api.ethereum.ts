// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { Interface } from '@ethersproject/abi';
import {
  BlockTag,
  Provider,
  Block,
  TransactionReceipt,
} from '@ethersproject/abstract-provider';
import { WebSocketProvider } from '@ethersproject/providers';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getLogger, IBlock, timeout } from '@subql/node-core';
import {
  ApiWrapper,
  EthereumBlock,
  EthereumTransaction,
  EthereumResult,
  EthereumLog,
  SubqlRuntimeDatasource,
  LightEthereumBlock,
  LightEthereumLog,
} from '@subql/types-ethereum';
import CacheableLookup from 'cacheable-lookup';
import { hexDataSlice, hexValue } from 'ethers/lib/utils';
import { retryOnFailEth } from '../utils/project';
import {
  CeloJsonRpcBatchProvider,
  CeloJsonRpcProvider,
  CeloWsProvider,
} from './ethers/celo/celo-provider';
import { JsonRpcBatchProvider } from './ethers/json-rpc-batch-provider';
import { JsonRpcProvider } from './ethers/json-rpc-provider';
import { OPFormatterMixin } from './ethers/op/op-provider';
import { ConnectionInfo } from './ethers/web';
import SafeEthProvider from './safe-api';
import {
  formatBlock,
  formatBlockUtil,
  formatLog,
  formatReceipt,
  formatTransaction,
} from './utils.ethereum';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const logger = getLogger('api.ethereum');

async function loadAssets(
  ds: SubqlRuntimeDatasource,
): Promise<Record<string, string>> {
  if (!ds.assets) {
    return {};
  }
  const res: Record<string, string> = {};

  for (const [name, { file }] of ds.assets.entries()) {
    try {
      res[name] = await fs.promises.readFile(file, { encoding: 'utf8' });
    } catch (e) {
      throw new Error(`Failed to load datasource asset ${file}`);
    }
  }

  return res;
}

function getHttpAgents() {
  // By default Nodejs doesn't cache DNS lookups
  // https://httptoolkit.com/blog/configuring-nodejs-dns/
  const lookup = new CacheableLookup();

  const options: http.AgentOptions = {
    keepAlive: true,
    /*, maxSockets: 100*/
  };

  const httpAgent = new http.Agent(options);
  const httpsAgent = new https.Agent(options);

  lookup.install(httpAgent);
  lookup.install(httpsAgent);

  return {
    http: httpAgent,
    https: httpsAgent,
  };
}

export class EthereumApi implements ApiWrapper {
  private client: JsonRpcProvider;

  // This is used within the sandbox when HTTP is used
  private nonBatchClient?: JsonRpcProvider;
  private genesisBlock: Record<string, any>;
  private contractInterfaces: Record<string, Interface> = {};
  private chainId: number;
  private name: string;

  // Ethereum POS
  private _supportsFinalization = true;

  get supportsFinalization(): boolean {
    return this._supportsFinalization;
  }

  /**
   * @param {string} endpoint - The endpoint of the RPC provider
   * @param {number} blockConfirmations - Used to determine how many blocks behind the head a block is considered finalized. Not used if the network has a concrete finalization mechanism.
   * @param {object} eventEmitter - Used to monitor the number of RPC requests
   */
  constructor(
    private endpoint: string,
    private blockConfirmations: number,
    private eventEmitter: EventEmitter2,
    private unfinalizedBlocks = false,
  ) {
    const { hostname, protocol, searchParams } = new URL(endpoint);

    const protocolStr = protocol.replace(':', '');

    logger.info(`Api host: ${hostname}, method: ${protocolStr}`);
    if (protocolStr === 'https' || protocolStr === 'http') {
      const connection: ConnectionInfo = {
        url: this.endpoint.split('?')[0],
        headers: {
          'User-Agent': `Subquery-Node ${packageVersion}`,
        },
        allowGzip: true,
        throttleLimit: 5,
        throttleSlotInterval: 1,
        agents: getHttpAgents(),
      };
      searchParams.forEach((value, name, searchParams) => {
        (connection.headers as any)[name] = value;
      });
      this.client = new (OPFormatterMixin(JsonRpcBatchProvider))(connection);
      this.nonBatchClient = new (OPFormatterMixin(JsonRpcProvider))(connection);
    } else if (protocolStr === 'ws' || protocolStr === 'wss') {
      this.client = new (OPFormatterMixin(WebSocketProvider))(this.endpoint);
    } else {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  async init(): Promise<void> {
    this.injectClient();

    const network = await this.client.getNetwork();

    //celo
    if (network.chainId === 42220) {
      if (this.client instanceof WebSocketProvider) {
        this.client = new CeloWsProvider(this.client.connection.url);
      } else {
        this.client = new CeloJsonRpcBatchProvider(this.client.connection);
        this.nonBatchClient = new CeloJsonRpcProvider(this.client.connection);
      }
    }

    try {
      const [genesisBlock, supportsFinalization, supportsSafe] =
        await Promise.all([
          this.getGenesisBlock(network.chainId),
          this.getSupportsTag('finalized'),
          this.getSupportsTag('safe'),
        ]);

      this.genesisBlock = genesisBlock;
      this._supportsFinalization = supportsFinalization && supportsSafe;
      this.chainId = network.chainId;
      this.name = network.name;
    } catch (e) {
      if ((e as Error).message.startsWith('Invalid response')) {
        this.client = this.nonBatchClient;

        logger.warn(
          `The RPC Node at ${this.endpoint} cannot process batch requests. ` +
            `Switching to non-batch mode for subsequent requests. Please consider checking if batch processing is supported on the RPC node.`,
        );

        return this.init();
      }

      throw e;
    }
  }

  private async getSupportsTag(tag: BlockTag): Promise<boolean> {
    try {
      // We set the timeout here because theres a bug in ethers where it will never resolve
      // It was happening with arbitrum on a syncing node
      const result = await timeout(this.client.getBlock(tag), 2);

      return true;
    } catch (e) {
      logger.info(`Chain doesnt support ${tag} tag`);
      return false;
    }
  }

  private injectClient(): void {
    const orig = this.client.send.bind(this.client);
    Object.defineProperty(this.client, 'send', {
      value: (...args) => {
        this.eventEmitter.emit('rpcCall');
        return orig(...args);
      },
    });
  }

  private async getGenesisBlock(chainId: number): Promise<Block> {
    const tag = () => {
      switch (chainId) {
        // BEVM Canary
        case 1501:
          return 4157986;
        default:
          return 'earliest';
      }
    };

    return this.client.getBlock(tag());
  }

  async getFinalizedBlock(): Promise<Block> {
    const height = this.supportsFinalization
      ? 'finalized'
      : (await this.getBestBlockHeight()) - this.blockConfirmations;

    const block = await this.client.getBlock(height);
    // The finalized block could sometimes fail to fetch,
    // due to some nodes on the network falling behind the synced node.
    if (!block) {
      throw new Error(`get finalized block "${height}" failed `);
    }
    return block;
  }

  async getFinalizedBlockHeight(): Promise<number> {
    return (await this.getFinalizedBlock()).number;
  }

  async getBestBlockHeight(): Promise<number> {
    // Cronos "safe" tag doesn't currently work as indended
    const tag =
      !this.unfinalizedBlocks &&
      this.supportsFinalization &&
      this.chainId !== 25
        ? 'safe'
        : 'latest';
    return (await this.client.getBlock(tag)).number;
  }

  getRuntimeChain(): string {
    return this.name;
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
    if (typeof heightOrHash === 'number') {
      heightOrHash = hexValue(heightOrHash);
    }
    return this.client.getBlock(heightOrHash);
  }

  private async getBlockPromise(num: number, includeTx = true): Promise<any> {
    const rawBlock = await this.client.send('eth_getBlockByNumber', [
      hexValue(num),
      includeTx,
    ]);

    if (!rawBlock) {
      throw new Error(`Failed to fetch block ${num}`);
    }

    const block = formatBlock(rawBlock);

    block.stateRoot = this.client.formatter.hash(block.stateRoot);

    return block;
  }
  async getTransactionReceipt(
    transactionHash: string | Promise<string>,
  ): Promise<TransactionReceipt> {
    return retryOnFailEth<TransactionReceipt>(
      this.client.getTransactionReceipt.bind(this.client, transactionHash),
    );
  }

  async fetchBlock(blockNumber: number): Promise<IBlock<EthereumBlock>> {
    try {
      const block = await this.getBlockPromise(blockNumber, true);
      const logsRaw = await this.client.getLogs({
        blockHash: block.hash,
      });

      // Certain RPC may not accommodate for blockHash, and would return wrong logs
      if (logsRaw.length) {
        assert(
          logsRaw.every((l) => l.blockHash === block.hash),
          `Log BlockHash does not match block: ${blockNumber}`,
        );
      }

      block.logs = logsRaw.map((l) => formatLog(l, block));
      block.transactions = block.transactions.map((tx) => ({
        ...formatTransaction(tx, block),
        receipt: () =>
          this.getTransactionReceipt(tx.hash).then((r) =>
            formatReceipt(r, block),
          ),
        logs: block.logs.filter((l) => l.transactionHash === tx.hash),
      }));

      this.eventEmitter.emit('fetchBlock');
      return formatBlockUtil(block);
    } catch (e) {
      throw this.handleError(e);
    }
  }

  private async fetchLightBlock(
    blockNumber: number,
  ): Promise<IBlock<LightEthereumBlock>> {
    const block = await this.getBlockPromise(blockNumber, false);
    const logs = await this.client.getLogs({ blockHash: block.hash });

    const lightBlock: LightEthereumBlock = {
      ...block,
      logs: logs.map((l) => formatLog(l, block)),
    };
    return formatBlockUtil<LightEthereumBlock>(lightBlock);
  }

  async fetchBlocks(bufferBlocks: number[]): Promise<IBlock<EthereumBlock>[]> {
    return Promise.all(bufferBlocks.map(async (num) => this.fetchBlock(num)));
  }

  async fetchBlocksLight(
    bufferBlocks: number[],
  ): Promise<IBlock<LightEthereumBlock>[]> {
    return Promise.all(
      bufferBlocks.map(async (num) => this.fetchLightBlock(num)),
    );
  }

  get api(): Provider {
    return this.client;
  }

  getSafeApi(blockHeight: number): SafeEthProvider {
    // We cannot use a batch http client because OnF don't support routing historical queries in batches to an archive nodes
    const client =
      this.client instanceof WebSocketProvider
        ? this.client
        : this.nonBatchClient;

    return new SafeEthProvider(client, blockHeight);
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
    log: EthereumLog | LightEthereumLog,
    ds: SubqlRuntimeDatasource,
  ): Promise<
    EthereumLog | LightEthereumLog | EthereumLog<T> | LightEthereumLog<T>
  > {
    try {
      if (!ds?.options?.abi) {
        logger.warn('No ABI provided for datasource');
        return log;
      }
      const iface = this.buildInterface(ds.options.abi, await loadAssets(ds));

      log.args = iface?.parseLog(log).args as T;

      return log;
    } catch (e) {
      logger.warn(`Failed to parse log data: ${e.message}`);
      return log;
    }
  }

  async parseTransaction<T extends EthereumResult = EthereumResult>(
    transaction: EthereumTransaction,
    ds: SubqlRuntimeDatasource,
  ): Promise<EthereumTransaction<T> | EthereumTransaction> {
    try {
      if (!ds?.options?.abi) {
        if (transaction.input !== '0x') {
          logger.warn('No ABI provided for datasource');
        }
        return transaction;
      }
      const assets = await loadAssets(ds);
      const iface = this.buildInterface(ds.options.abi, assets);
      const func = iface.getFunction(hexDataSlice(transaction.input, 0, 4));
      const args = iface.decodeFunctionData(func, transaction.input) as T;

      transaction.logs =
        transaction.logs &&
        ((await Promise.all(
          transaction.logs.map(async (log) => this.parseLog(log, ds)),
        )) as Array<EthereumLog | EthereumLog<T>>);

      transaction.args = args;
      return transaction;
    } catch (e) {
      logger.warn(`Failed to parse transaction data: ${e.message}`);
      return transaction;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async connect(): Promise<void> {
    logger.error('Ethereum API connect is not implemented');
    throw new Error('Not implemented');
  }

  async disconnect(): Promise<void> {
    if (this.client instanceof WebSocketProvider) {
      await this.client.destroy();
    } else {
      logger.warn('Disconnect called on HTTP provider');
    }
  }

  handleError(e: Error): Error {
    if ((e as any)?.status === 429) {
      const { hostname } = new URL(this.endpoint);
      return new Error(`Rate Limited at endpoint: ${hostname}`);
    }

    return e;
  }
}
