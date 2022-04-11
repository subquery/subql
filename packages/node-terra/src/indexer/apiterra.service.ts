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
import { argv } from '../yargs';
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
      network.endpoint,
      this.nodeConfig.networkEndpointParams,
      network.mantlemint,
    );

    try {
      this.api.mantlemintHealthOK = await this.api.mantlemintHealthCheck();
      logger.info('mantlemint health check done...');
    } catch (e) {
      logger.info('mantlemint health check failed...');
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
    private tendermintURL: string,
    private readonly params?: Record<string, string>,
    private mantlemintURL?: string,
  ) {}

  async nodeInfo(): Promise<any> {
    const config = {
      method: 'get',
      url: `${this.tendermintURL}/cosmos/base/tendermint/v1beta1/node_info`,
      timeout: argv('node-timeout'),
    };

    const { data } = await axios(config);
    return data;
  }

  async blockInfo(height?: number): Promise<BlockInfo> {
    if (this.mantlemintHealthOK && height) {
      return this.blockInfoMantlemint(height);
    }
    const config = {
      method: 'get',
      url: height
        ? `${this.tendermintURL}/cosmos/base/tendermint/v1beta1/blocks/${height}`
        : `${this.tendermintURL}/cosmos/base/tendermint/v1beta1/blocks/latest`,
      timeout: argv('node-timeout'),
    };

    const { data } = await axios(config);
    return data;
  }

  async blockInfoMantlemint(height?: number): Promise<BlockInfo> {
    const config = {
      method: 'get',
      url: `${this.mantlemintURL}/index/blocks/${height}`,
    };

    const { data } = await axios(config);
    return data;
  }

  async txInfo(hash: string): Promise<TxInfo> {
    const config = {
      method: 'get',
      url: `${this.tendermintURL}/cosmos/tx/v1beta1/txs/${hashToHex(hash)}`,
      timeout: argv('node-timeout'),
    };

    const { data } = await axios(config);
    return data.tx_response;
  }

  async getTxInfobyHashes(
    txHashes: string[],
    height: string,
  ): Promise<TxInfo[]> {
    if (this.mantlemintHealthOK) {
      return this.txsByHeightMantlemint(height);
    }
    return Promise.all(
      txHashes.map(async (hash) => {
        return this.txInfo(hash);
      }),
    );
  }

  async mantlemintHealthCheck(): Promise<boolean> {
    if (!this.mantlemintURL) {
      return false;
    }
    const config = {
      method: 'get',
      url: `${this.mantlemintURL}/health`,
    };
    const { data } = await axios(config);
    return data === 'OK';
  }

  async txsByHeightMantlemint(height: string): Promise<TxInfo[]> {
    const config = {
      method: 'get',
      url: `${this.mantlemintURL}/index/tx/by_height/${height}`,
    };
    const { data } = await axios(config);
    return data;
  }

  get getLCDClient(): LCDClient {
    /* TODO remove this and wrap all calls to include params */
    return this.baseApi;
  }
}
