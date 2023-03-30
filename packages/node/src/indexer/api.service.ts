// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TextDecoder } from 'util';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { toHex } from '@cosmjs/encoding';
import { Uint53 } from '@cosmjs/math';
import { DecodeObject, GeneratedType, Registry } from '@cosmjs/proto-signing';
import { Block, IndexedTx, defaultRegistryTypes } from '@cosmjs/stargate';
import {
  HttpEndpoint,
  Tendermint34Client,
  toRfc3339WithNanoseconds,
  BlockResultsResponse,
} from '@cosmjs/tendermint-rpc';
import {
  BlockResponse,
  Validator,
} from '@cosmjs/tendermint-rpc/build/tendermint34/responses';
import { Inject, Injectable } from '@nestjs/common';
import {
  getLogger,
  NetworkMetadataPayload,
  retryOnFailAxios,
} from '@subql/node-core';
import {
  MsgClearAdmin,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgStoreCode,
  MsgUpdateAdmin,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import {
  CosmosProjectNetConfig,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { HttpClient, WebsocketClient } from './rpc-clients';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

// https://github.com/polkadot-js/api/blob/12750bc83d8d7f01957896a80a7ba948ba3690b7/packages/rpc-provider/src/ws/index.ts#L43
const RETRY_DELAY = 2_500;
const TIMEOUT = 90 * 1000;

const logger = getLogger('api');
const RETRY_STATUS_CODES = [429, 502];

@Injectable()
export class ApiService {
  private api: CosmosClient;
  private tendermint: Tendermint34Client;
  private currentBlockHash: string;
  private currentBlockNumber: number;
  networkMeta: NetworkMetadataPayload;
  registry: Registry;

  constructor(@Inject('ISubqueryProject') protected project: SubqueryProject) {}

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

      const rpcClient =
        network.endpoint.includes('ws://') ||
        network.endpoint.includes('wss://')
          ? new WebsocketClient(network.endpoint, (err) => {
              logger.error(err, `Websocket connection failed`);
              process.exit(1);
            })
          : new HttpClient(endpoint);

      this.tendermint = await Tendermint34Client.create(rpcClient);
      this.registry = new Registry([...defaultRegistryTypes, ...wasmTypes]);

      const chaintypes = await this.getChainType(network);
      for (const typeurl in chaintypes) {
        this.registry.register(typeurl, chaintypes[typeurl]);
      }

      this.api = new CosmosClient(this.tendermint, this.registry);

      this.networkMeta = {
        chain: network.chainId,
        specName: undefined,
        genesisHash: undefined,
      };

      const chainId = await this.api.getChainId();
      if (network.chainId !== chainId) {
        const err = new Error(
          `Network chainId doesn't match expected genesisHash. Your SubQuery project is expecting to index data from "${network.chainId}", however the endpoint that you are connecting to is different("${this.networkMeta.genesisHash}). Please check that the RPC endpoint is actually for your desired network or update the genesisHash.`,
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSafeApi(height: number): Promise<CosmosSafeClient> {
    return new CosmosSafeClient(this.tendermint, height);
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
        const msgObj = network.chainTypes.protoRoot.lookupTypeOrEnum(
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
    public registry: Registry,
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async blockInfo(height?: number): Promise<BlockResponse> {
    return retryOnFailAxios<BlockResponse>(
      this.tendermintClient.block.bind(this.tendermintClient, height),
      RETRY_STATUS_CODES,
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async txInfoByHeight(height: number): Promise<readonly IndexedTx[]> {
    return retryOnFailAxios<IndexedTx[]>(
      this.searchTx.bind(this, height),
      RETRY_STATUS_CODES,
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async blockResults(height: number): Promise<BlockResultsResponse> {
    return retryOnFailAxios<BlockResultsResponse>(
      this.tendermintClient.blockResults.bind(this.tendermintClient, height),
      RETRY_STATUS_CODES,
    );
  }

  decodeMsg<T = unknown>(msg: DecodeObject): T {
    try {
      const decodedMsg = this.registry.decode(msg);
      if (
        [
          '/cosmwasm.wasm.v1.MsgExecuteContract',
          '/cosmwasm.wasm.v1.MsgMigrateContract',
          '/cosmwasm.wasm.v1.MsgInstantiateContract',
        ].includes(msg.typeUrl)
      ) {
        decodedMsg.msg = JSON.parse(new TextDecoder().decode(decodedMsg.msg));
      }
      return decodedMsg;
    } catch (e) {
      logger.error(e, 'Failed to decode message');
      throw e;
    }
  }
}

// TODO make this class not exported and expose interface instead
export class CosmosSafeClient extends CosmWasmClient {
  height: number;

  constructor(tmClient: Tendermint34Client, height: number) {
    super(tmClient);
    this.height = height;
  }

  // Deprecate
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

  async validators(): Promise<readonly Validator[]> {
    return (
      await this.forceGetTmClient().validators({
        height: this.height,
      })
    ).validators;
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
        events: tx.result.events.map((evt) => ({
          ...evt,
          attributes: evt.attributes.map((attr) => ({
            key: Buffer.from(attr.key).toString('utf8'),
            value: Buffer.from(attr.value).toString('utf8'),
          })),
        })),
      };
    });
  }
}
