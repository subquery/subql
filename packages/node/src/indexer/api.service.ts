// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { TextDecoder } from 'util';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { fromAscii, toHex } from '@cosmjs/encoding';
import { Uint53 } from '@cosmjs/math';
import { DecodeObject, GeneratedType, Registry } from '@cosmjs/proto-signing';
import {
  Block,
  IndexedTx,
  StargateClient,
  StargateClientOptions,
  defaultRegistryTypes,
  isSearchByHeightQuery,
  isSearchBySentFromOrToQuery,
  isSearchByTagsQuery,
  SearchTxFilter,
  SearchTxQuery,
} from '@cosmjs/stargate';
import {
  HttpEndpoint,
  Tendermint34Client,
  toRfc3339WithNanoseconds,
  BlockResultsResponse,
} from '@cosmjs/tendermint-rpc';
import { Injectable } from '@nestjs/common';
import { CosmosProjectNetworkConfig } from '@subql/common-cosmos';
import {
  MsgClearAdmin,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgStoreCode,
  MsgUpdateAdmin,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { EventEmitter2 } from 'eventemitter2';
import { load } from 'protobufjs';
import {
  CosmosProjectNetConfig,
  SubqlProjectDs,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { getLogger } from '../utils/logger';
import { DsProcessorService } from './ds-processor.service';
import { NetworkMetadataPayload } from './events';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const logger = getLogger('api');

@Injectable()
export class ApiService {
  private api: CosmosClient;
  private clientConfig: StargateClientOptions;
  networkMeta: NetworkMetadataPayload;
  dsProcessor: DsProcessorService;
  constructor(
    protected project: SubqueryProject,
    private eventEmitter: EventEmitter2,
  ) {}

  async init(): Promise<ApiService> {
    try {
      const { network } = this.project;
      this.clientConfig = {};
      const wasmTypes: ReadonlyArray<[string, GeneratedType]> = [
        ['/cosmwasm.wasm.v1.MsgClearAdmin', MsgClearAdmin],
        ['/cosmwasm.wasm.v1.MsgExecuteContract', MsgExecuteContract],
        ['/cosmwasm.wasm.v1.MsgMigrateContract', MsgMigrateContract],
        ['/cosmwasm.wasm.v1.MsgStoreCode', MsgStoreCode],
        ['/cosmwasm.wasm.v1.MsgInstantiateContract', MsgInstantiateContract],
        ['/cosmwasm.wasm.v1.MsgUpdateAdmin', MsgUpdateAdmin],
      ];

      const endpoint: HttpEndpoint = {
        url: network.endpoint,
        headers: {
          'User-Agent': `SubQuery-Node ${packageVersion}`,
        },
      };
      const client = await CosmWasmClient.connect(endpoint);
      const tendermint = await Tendermint34Client.connect(endpoint);
      const registry = new Registry([...defaultRegistryTypes, ...wasmTypes]);

      const chaintypes = await this.getChainType(network);
      for (const typeurl in chaintypes) {
        registry.register(typeurl, chaintypes[typeurl]);
      }

      this.api = new CosmosClient(client, tendermint, registry);

      this.networkMeta = {
        chainId: network.chainId,
      };

      const chainId = await this.api.chainId();
      if (network.chainId !== chainId) {
        const err = new Error(
          `The given chainId does not match with client: "${network.chainId}"`,
        );
        logger.error(err, err.message);
        throw err;
      }

      return this;
    } catch (e) {
      logger.error(e, 'Failed to init api service');
      process.exit(1);
    }
  }

  getApi(): CosmosClient {
    return this.api;
  }

  async getSafeApi(height: number): Promise<CosmosSafeClient> {
    const { network } = this.project;
    const endpoint: HttpEndpoint = {
      url: network.endpoint,
      headers: {
        'User-Agent': `SubQuery-Node ${packageVersion}`,
      },
    };
    const client = await CosmosSafeClient.safeConnect(endpoint, height);
    return client;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getChainType(
    network: Partial<CosmosProjectNetConfig>,
  ): Promise<Record<string, GeneratedType>> {
    if (!network.chainTypes) {
      return {};
    }

    const res: Record<string, GeneratedType> = {};
    for (const [packageName, { messages, proto }] of network.chainTypes) {
      for (const msg of messages) {
        logger.info(`Registering chain message type "/${packageName}.${msg}"`);
        const msgObj = proto.lookupType(`${packageName}.${msg}`);
        res[`/${packageName}.${msg}`] = msgObj;
      }
    }
    return res;
  }
}

export class CosmosClient {
  constructor(
    private readonly baseApi: CosmWasmClient,
    private readonly tendermintClient: Tendermint34Client,
    private registry: Registry,
  ) {}

  async chainId(): Promise<string> {
    return this.baseApi.getChainId();
  }

  async finalisedHeight(): Promise<number> {
    return this.baseApi.getHeight();
  }

  async blockInfo(height?: number): Promise<Block> {
    return this.baseApi.getBlock(height);
  }

  async txInfoByHeight(height: number): Promise<readonly IndexedTx[]> {
    return this.baseApi.searchTx({ height: height });
  }

  async blockResults(height: number): Promise<BlockResultsResponse> {
    const blockRes = await this.tendermintClient.blockResults(height);
    return blockRes;
  }

  decodeMsg<T = unknown>(msg: DecodeObject): T {
    try {
      const decodedMsg = this.registry.decode(msg);
      if (msg.typeUrl === '/cosmwasm.wasm.v1.MsgExecuteContract') {
        decodedMsg.msg = JSON.parse(new TextDecoder().decode(decodedMsg.msg));
      }
      return decodedMsg;
    } catch (e) {
      logger.error(e, 'Failed to decode message');
      throw e;
    }
  }

  get StargateClient(): CosmWasmClient {
    /* TODO remove this and wrap all calls to include params */
    return this.baseApi;
  }
}

export class CosmosSafeClient extends CosmWasmClient {
  height: number;

  static async safeConnect(
    endpoint: string | HttpEndpoint,
    height: number,
  ): Promise<CosmosSafeClient> {
    const tmClient = await Tendermint34Client.connect(endpoint);
    return new CosmosSafeClient(tmClient, height);
  }

  constructor(tmClient: Tendermint34Client | undefined, height: number) {
    super(tmClient);
    this.height = height;
  }

  async getBlock(): Promise<Block> {
    const response = await this.forceGetTmClient().block(this.height);
    return {
      id: toHex(response.blockId.hash).toUpperCase(),
      header: {
        version: {
          block: new Uint53(response.block.header.version.block).toString(),
          app: new Uint53(response.block.header.version.app).toString(),
        },
        height: response.block.header.height,
        chainId: response.block.header.chainId,
        time: toRfc3339WithNanoseconds(response.block.header.time),
      },
      txs: response.block.txs,
    };
  }

  async searchTx(): Promise<readonly IndexedTx[]> {
    const txs: readonly IndexedTx[] = await this.safeTxsQuery(
      `tx.height=${this.height}`,
    );
    return txs;
  }

  private async safeTxsQuery(query: string): Promise<readonly IndexedTx[]> {
    const results = await this.forceGetTmClient().txSearchAll({ query: query });
    return results.txs.map((tx) => {
      return {
        height: tx.height,
        hash: toHex(tx.hash).toUpperCase(),
        code: tx.result.code,
        rawLog: tx.result.log || '',
        tx: tx.tx,
        gasUsed: tx.result.gasUsed,
        gasWanted: tx.result.gasWanted,
      };
    });
  }
}
