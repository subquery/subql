// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GeneratedType, Registry } from '@cosmjs/proto-signing';
import {
  Block,
  IndexedTx,
  StargateClient,
  StargateClientOptions,
  defaultRegistryTypes,
} from '@cosmjs/stargate';
import { Injectable } from '@nestjs/common';
import {
  MsgClearAdmin,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgStoreCode,
  MsgUpdateAdmin,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx';

import { load } from 'protobufjs';
import {
  SubqlCosmosProjectDs,
  SubqueryCosmosProject,
} from '../configure/cosmosproject.model';
import { NodeConfig } from '../configure/NodeConfig';
import { getLogger } from '../utils/logger';

import { CosmosDsProcessorService } from './cosmosds-processor.service';
import { NetworkMetadataPayload } from './events';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const logger = getLogger('api');

@Injectable()
export class ApiCosmosService {
  private api: CosmosClient;
  private clientConfig: StargateClientOptions;
  networkMeta: NetworkMetadataPayload;
  dsProcessor: CosmosDsProcessorService;
  constructor(
    protected project: SubqueryCosmosProject,
    private nodeConfig: NodeConfig,
  ) {}

  async init(): Promise<ApiCosmosService> {
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

    const client = await CosmWasmClient.connect(network.endpoint);

    const registry = new Registry([...defaultRegistryTypes, ...wasmTypes]);
    for (const ds of this.project.dataSources) {
      const chaintypes = await this.getChainType(ds);
      for (const typeurl in chaintypes) {
        registry.register(typeurl, chaintypes[typeurl]);
      }
    }
    this.api = new CosmosClient(client, registry);

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
  }

  getApi(): CosmosClient {
    return this.api;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getChainType(
    ds: SubqlCosmosProjectDs,
  ): Promise<Record<string, GeneratedType>> {
    if (!ds.chainTypes) {
      return {};
    }

    const res: Record<string, GeneratedType> = {};
    for (const packages of ds.chainTypes) {
      const packageName = packages[0];
      const file = packages[1].file;
      const messages = packages[1].messages;
      load(path.join(this.project.root, file), function (err, root) {
        if (err) throw err;
        for (const msg of messages) {
          const msgObj = root.lookupType(`${packageName}.${msg}`);
          res[`/${packageName}.${msg}`] = msgObj;
        }
      });
    }
    return res;
  }
}

export class CosmosClient {
  constructor(
    private readonly baseApi: CosmWasmClient,
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

  decodeMsg(msg: any) {
    try {
      return this.registry.decode(msg);
    } catch (e) {
      logger.error(e);
      return {};
    }
  }

  get StargateClient(): CosmWasmClient {
    /* TODO remove this and wrap all calls to include params */
    return this.baseApi;
  }
}
