// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import http from 'http';
import https from 'https';
import { Registry } from '@cosmjs/proto-signing';
import {
  Block,
  IndexedTx,
  StargateClient,
  StargateClientOptions,
  defaultRegistryTypes,
} from '@cosmjs/stargate';
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { Client } from 'pg';
import { textChangeRangeIsUnchanged } from 'typescript';
import { SubqueryCosmosProject } from '../configure/cosmosproject.model';
import { NodeConfig } from '../configure/NodeConfig';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import { argv } from '../yargs';
import { NetworkMetadataPayload } from './events';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const logger = getLogger('api');

@Injectable()
export class ApiCosmosService {
  private api: CosmosClient;
  private clientConfig: StargateClientOptions;
  networkMeta: NetworkMetadataPayload;

  constructor(
    protected project: SubqueryCosmosProject,
    private nodeConfig: NodeConfig,
  ) {}

  async init(): Promise<ApiCosmosService> {
    const { network } = this.project;
    this.clientConfig = {};
    const client = await StargateClient.connect(network.endpoint);

    const registry = new Registry(defaultRegistryTypes);
    this.api = new CosmosClient(client, registry);

    this.networkMeta = {
      chainId: network.chainId,
    };

    const chainId = await this.api.chainId();

    if (network.chainId !== chainId) {
      logger.info(chainId);
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
}

export class CosmosClient {
  constructor(
    private readonly baseApi: StargateClient,
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

  get StargateClient(): StargateClient {
    /* TODO remove this and wrap all calls to include params */
    return this.baseApi;
  }
}
