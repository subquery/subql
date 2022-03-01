// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BlockHash } from '@polkadot/types/interfaces';
import { SubqueryProject } from '../configure/SubqueryProject';
import { getLogger } from '../utils/logger';
import { AlgorandApi } from './api.algorand';
import { SubstrateApi } from './api.substrate';
import { NetworkMetadataPayload } from './events';
import { ApiAt, ApiWrapper } from './types';

const logger = getLogger('api');

@Injectable()
export class ApiService implements OnApplicationShutdown {
  private api: ApiWrapper;
  networkMeta: NetworkMetadataPayload;

  constructor(
    protected project: SubqueryProject,
    private eventEmitter: EventEmitter2,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.project.network === 'substrate') {
      await Promise.all([this.api?.disconnect()]);
    }
  }

  async init(): Promise<ApiService> {
    try {
      let chainTypes, network;
      try {
        chainTypes = this.project.chainTypes;
        network = this.project.network;
      } catch (e) {
        logger.error(e);
        process.exit(1);
      }
      logger.info(JSON.stringify(this.project.network));

      if (network.type === 'substrate') {
        // TODO: Find another way to identify chain
        this.api = new SubstrateApi(network, chainTypes, this.eventEmitter);
      } else if (network.type === 'algorand') {
        this.api = new AlgorandApi({
          token: network.token,
          server: network.endpoint,
          port: network.port,
        });
      }

      await this.api.init();

      this.networkMeta = {
        chain: this.api.getRuntimeChain(),
        specName: this.api.getSpecName(),
        genesisHash: this.api.getGenesisHash(),
      };

      if (
        network.genesisHash &&
        network.genesisHash !== this.networkMeta.genesisHash
      ) {
        const err = new Error(
          `Network genesisHash doesn't match expected genesisHash. expected="${network.genesisHash}" actual="${this.networkMeta.genesisHash}`,
        );
        logger.error(err, err.message);
        throw err;
      }

      return this;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  getApi(): ApiWrapper {
    return this.api;
  }

  async getPatchedApi(
    blockHash: string | BlockHash,
    blockNumber: number,
    parentBlockHash?: BlockHash,
  ): Promise<ApiAt> {
    const substrateApi = this.api as SubstrateApi;
    const patchedApi = await substrateApi.getPatchedApi(
      blockHash,
      blockNumber,
      parentBlockHash,
    );
    return patchedApi;
  }
}
