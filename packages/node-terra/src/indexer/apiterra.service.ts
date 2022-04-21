// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import http from 'http';
import https from 'https';
import { Injectable } from '@nestjs/common';
import {
  BlockInfo,
  hashToHex,
  LCDClient,
  LCDClientConfig,
  TxInfo,
} from '@terra-money/terra.js';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import { argv } from '../yargs';
import { NetworkMetadataPayload } from './events';

const logger = getLogger('api');

@Injectable()
export class ApiTerraService {
  private api: TerraClient;
  private clientConfig: LCDClientConfig;
  networkMeta: NetworkMetadataPayload;

  constructor(
    protected project: SubqueryTerraProject,
    private nodeConfig: NodeConfig,
  ) {}

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
      logger.info(
        `mantlemint health check done... enabled: ${this.api.mantlemintHealthOK}`,
      );
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

  private _lcdConnection: AxiosInstance;
  private _mantlemintConnection: AxiosInstance;

  constructor(
    private readonly baseApi: LCDClient,
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
      },
    });

    if (this.mantlemintURL) {
      this._mantlemintConnection = axios.create({
        baseURL: this.mantlemintURL,
        headers: {
          Accept: 'application/json',
        },
      });
    }
  }

  private disableMantlemint() {
    logger.warn('Mantlemint returning invalid responses, disabling');
    this.mantlemintHealthOK = false;
  }

  async nodeInfo(): Promise<any> {
    try {
      const { data } = await this._lcdConnection.get(
        `/cosmos/base/tendermint/v1beta1/node_info`,
        this.params,
      );
      return data;
    } catch (e) {
      logger.warn(`Faile dto get node info ${e}`);
      throw e;
    }
  }

  async blockInfo(height?: number): Promise<BlockInfo> {
    if (this.mantlemintHealthOK && height) {
      return this.blockInfoMantlemint(height);
    }

    try {
      const { data } = await this._lcdConnection.get(
        `/cosmos/base/tendermint/v1beta1/blocks/${height ?? 'latest'}`,
        this.params,
      );
      return data;
    } catch (e) {
      if ((e as AxiosError).response.status === 400) {
        logger.error(`block ${height} unavailable to fetch, retrying...`);
        await delay(1);
        return this.blockInfo(height);
      } else {
        logger.info('here');
        throw e;
      }
    }
  }

  async txInfo(hash: string): Promise<TxInfo> {
    try {
      const { data } = await this._lcdConnection.get(
        `/cosmos/tx/v1beta1/txs/${hashToHex(hash)}`,
        this.params,
      );
      return TxInfo.fromData(data.tx_response);
    } catch (e) {
      if ((e as AxiosError).response.status === 400) {
        logger.error(`tx ${hash} unavailable to fetch, retrying...`);
        await delay(1);
        return this.txInfo(hash);
      } else {
        logger.info('here');
        throw e;
      }
    }
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
    if (!this.mantlemintURL || !this._mantlemintConnection) {
      return false;
    }

    const { data } = await this._mantlemintConnection.get('/health');
    return data === 'OK';
  }

  async blockInfoMantlemint(height?: number): Promise<BlockInfo> {
    try {
      const { data } = await this._mantlemintConnection.get(
        `/index/blocks/${height}`,
      );
      return data;
    } catch (e) {
      // Mantlemint can lag behind the network, at that point we disable it and switch to LCD
      // https://github.com/terra-money/mantlemint/blob/e019308386a23ba4ed405285ca151967ee21623c/indexer/block/client.go#L20-L21
      if (e.response.status === 400) {
        this.disableMantlemint();
        return this.blockInfo(height);
      } else {
        throw e;
      }
    }
  }

  async txsByHeightMantlemint(height: string): Promise<TxInfo[]> {
    const { data } = await this._mantlemintConnection.get(
      `/index/tx/by_height/${height}`,
    );
    // Changes are to cover minor differences between mantlemint and LCD
    return data.map((d) => {
      d.logs = d.logs.map((log) => {
        log.log = log.log ?? '';
        log.msg_index = log.msg_index ?? 0;
        return log;
      });
      d.timestamp = d.timestamp ? d.timestamp.replace(/\.\d+/, '') : '';
      return TxInfo.fromData(d);
    });
  }

  get LCDClient(): LCDClient {
    /* TODO remove this and wrap all calls to include params */
    return this.baseApi;
  }
}
