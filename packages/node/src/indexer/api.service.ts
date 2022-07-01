// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import http from 'http';
import https from 'https';
import { TextDecoder } from 'util';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { toHex } from '@cosmjs/encoding';
import {
  isJsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  parseJsonRpcResponse,
} from '@cosmjs/json-rpc';
import { Uint53 } from '@cosmjs/math';
import { DecodeObject, GeneratedType, Registry } from '@cosmjs/proto-signing';
import { Block, IndexedTx, defaultRegistryTypes } from '@cosmjs/stargate';
import {
  HttpEndpoint,
  Tendermint34Client,
  toRfc3339WithNanoseconds,
  BlockResultsResponse,
} from '@cosmjs/tendermint-rpc';
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { MsgVoteWeighted } from 'cosmjs-types/cosmos/gov/v1beta1/tx';
import {
  MsgClearAdmin,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgStoreCode,
  MsgUpdateAdmin,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { EventEmitter2 } from 'eventemitter2';
import {
  CosmosProjectNetConfig,
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
  networkMeta: NetworkMetadataPayload;
  dsProcessor: DsProcessorService;
  registry: Registry;
  constructor(
    protected project: SubqueryProject,
    private eventEmitter: EventEmitter2,
  ) {}

  async init(): Promise<ApiService> {
    try {
      const { network } = this.project;
      // https://github.com/cosmos/cosmjs/blob/ae06012a1510ddf48068bbf21374c0bbff3d5bab/packages/cosmwasm-stargate/src/modules/wasm/messages.ts#L11
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

      const keepAliveClient = new KeepAliveClient(endpoint);
      const tendermint = await Tendermint34Client.create(keepAliveClient);
      this.registry = new Registry([...defaultRegistryTypes, ...wasmTypes]);

      const chaintypes = await this.getChainType(network);
      for (const typeurl in chaintypes) {
        this.registry.register(typeurl, chaintypes[typeurl]);
      }

      this.api = new CosmosClient(tendermint, this.registry);

      this.networkMeta = {
        chainId: network.chainId,
      };

      const chainId = await this.api.getChainId();
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
    for (const [
      userPackageName,
      { messages, packageName },
    ] of network.chainTypes) {
      const pkgName = packageName ?? userPackageName;
      for (const msg of messages) {
        logger.info(`Registering chain message type "/${pkgName}.${msg}"`);
        const msgObj = network.chainTypes.protoRoot.lookupType(
          `${pkgName}.${msg}`,
        );
        res[`/${pkgName}.${msg}`] = msgObj;
      }
    }
    return res;
  }
}

export class CosmosClient extends CosmWasmClient {
  constructor(
    private readonly tendermintClient: Tendermint34Client,
    private registry: Registry,
  ) {
    super(tendermintClient);
  }

  /*
  async chainId(): Promise<string> {
    return this.getChainId();
  }

  async finalisedHeight(): Promise<number> {
    return this.getHeight();
  }
  */

  async blockInfo(height?: number): Promise<Block> {
    return this.getBlock(height);
  }

  async txInfoByHeight(height: number): Promise<readonly IndexedTx[]> {
    return this.searchTx({ height: height });
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
}

export class CosmosSafeClient extends CosmWasmClient {
  height: number;

  static async safeConnect(
    endpoint: string | HttpEndpoint,
    height: number,
  ): Promise<CosmosSafeClient> {
    const keepAliveClient = new KeepAliveClient(endpoint);
    const tmClient = await Tendermint34Client.create(keepAliveClient);
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

export interface RpcClient {
  readonly execute: (
    request: JsonRpcRequest,
  ) => Promise<JsonRpcSuccessResponse>;
  readonly disconnect: () => void;
}

export function hasProtocol(url: string): boolean {
  return url.search('://') !== -1;
}

export async function httpRequest(
  connection: AxiosInstance,
  request?: any,
): Promise<any> {
  const { data } = await connection.post('/', request);

  return data;
}

export class KeepAliveClient implements RpcClient {
  protected readonly url: string;
  protected readonly headers: Record<string, string> | undefined;
  connection: AxiosInstance;

  constructor(endpoint: string | HttpEndpoint) {
    if (typeof endpoint === 'string') {
      // accept host.name:port and assume http protocol
      this.url = hasProtocol(endpoint) ? endpoint : `http://${endpoint}`;
    } else {
      this.url = endpoint.url;
      this.headers = endpoint.headers;
    }
    const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });
    const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });
    this.connection = axios.create({
      httpAgent,
      httpsAgent,
      baseURL: this.url,
      headers: this.headers,
    });
  }

  disconnect(): void {
    // nothing to be done
  }

  async execute(request: JsonRpcRequest): Promise<JsonRpcSuccessResponse> {
    const response = parseJsonRpcResponse(
      await httpRequest(this.connection, request),
    );
    if (isJsonRpcErrorResponse(response)) {
      throw new Error(JSON.stringify(response.error));
    }
    return response;
  }
}
