// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import {
  BlockInfo,
  hashToHex,
  LCDClient,
  LCDClientConfig,
  TxInfo,
} from '@terra-money/terra.js';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { getLogger } from '../utils/logger';
import { NetworkMetadataPayload } from './events';
const logger = getLogger('api');
const axios = require('axios');

@Injectable()
export class ApiTerraService {
  private api: TerraClient;
  private clientConfig: LCDClientConfig;
  networkMeta: NetworkMetadataPayload;

  constructor(
    protected project: SubqueryTerraProject,
    private nodeConfig: NodeConfig,
  ) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(): Promise<ApiTerraService> {
    const { network } = this.project;
    this.clientConfig = {
      URL: network.endpoint,
      chainID: network.chainId,
    };

    this.api = new TerraClient(
      new LCDClient(this.clientConfig),
      this.nodeConfig.networkEndpointParams,
      network.endpoint,
    );

    try {
      const mantlemintHealth = await this.api.mantlemintHealthCheck();
      this.api.mantlemintHealthOK = mantlemintHealth === 'OK';
    } catch (e) {
      this.api.mantlemintHealthOK = false;
    }

    this.networkMeta = {
      chainId: network.chainId,
    };

    const nodeInfo = await this.api.nodeInfo();

    if (network.chainId !== nodeInfo.default_node_info.network) {
      const err = new Error(
        `The given chainId does not match with client: "${network.chainId}"`,
      );
      logger.error(err, err.message);
      throw err;
    }

    return this;
  }

  getApi(): TerraClient {
    return this.api;
  }
}

export class TerraClient {
  mantlemintHealthOK = false;
  constructor(
    private readonly baseApi: LCDClient,
    private readonly params?: Record<string, string>,
    private baseUrl?: string,
  ) {}

  async nodeInfo(): Promise<any> {
    return this.baseApi.tendermint.nodeInfo(this.params);
  }

  async blockInfo(height?: number): Promise<BlockInfo> {
    return this.baseApi.tendermint.blockInfo(height, this.params);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async blockInfoMantlemint(height?: number): Promise<BlockInfo> {
    const config = {
      method: 'get',
      url: `${this.baseUrl}:1318/index/blocks/${height}`,
    };
    return axios(config)
      .then((d) => d.data)
      .catch((e) => {
        throw e;
      });
  }

  async txInfo(hash: string): Promise<TxInfo> {
    return this.baseApi.tx.txInfo(hashToHex(hash), this.params);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async mantlemintHealthCheck(): Promise<string> {
    const config = {
      method: 'get',
      url: `${this.baseUrl}:1318/health`,
      headers: {},
    };
    return axios(config)
      .then((d) => d.data)
      .catch((e) => {
        throw e;
      });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async txsByHeightMantlemint(height: string): Promise<TxInfo[]> {
    const config = {
      method: 'get',
      url: `${this.baseUrl}:1318/index/tx/by_height/${height}`,
    };
    return axios(config)
      .then((d) => d.data)
      .catch((e) => {
        throw e;
      });
  }

  get getLCDClient(): LCDClient {
    /* TODO remove this and wrap all calls to include params */
    return this.baseApi;
  }
}
