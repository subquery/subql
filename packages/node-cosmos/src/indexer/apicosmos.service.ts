// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import http from 'http';
import https from 'https';
import {
  Block,
  IndexedTx,
  StargateClient,
  StargateClientOptions,
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

    this.api = new CosmosClient(
      client,
      network.endpoint,
      this.nodeConfig.networkEndpointParams,
    );

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
}

export class CosmosClient {
  mantlemintHealthOK = false;

  private _lcdConnection: AxiosInstance;
  private _mantlemintConnection: AxiosInstance;

  constructor(
    private readonly baseApi: StargateClient,
    private tendermintURL: string,
    private readonly params?: Record<string, string>,
    private mantlemintURL?: string,
  ) {
    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({ keepAlive: true });

    this._lcdConnection = axios.create({
      httpAgent,
      httpsAgent,
      timeout: argv('node-timeout') as number,
      baseURL: this.tendermintURL,
      headers: {
        Accept: 'application/json',
        'User-Agent': `SubQuery-Node ${packageVersion}`,
      },
    });

    if (this.mantlemintURL) {
      this._mantlemintConnection = axios.create({
        baseURL: this.mantlemintURL,
        headers: {
          Accept: 'application/json',
          'User-Agent': `SubQuery-Node ${packageVersion}`,
        },
      });
    }
  }

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

  get StargateClient(): StargateClient {
    /* TODO remove this and wrap all calls to include params */
    return this.baseApi;
  }
}
