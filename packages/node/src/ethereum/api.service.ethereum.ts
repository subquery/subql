// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { ProjectNetworkV1_0_0 } from '@subql/common-ethereum';
import { ApiService, getLogger } from '@subql/node-core';
import { EthereumApi } from './api.ethereum';

const logger = getLogger('api');

@Injectable()
export class EthereumApiService extends ApiService {
  private _api: EthereumApi;

  async init(): Promise<EthereumApiService> {
    try {
      let network: ProjectNetworkV1_0_0;
      try {
        network = this.project.network;
      } catch (e) {
        logger.error(Object.keys(e));
        process.exit(1);
      }

      this.api = new EthereumApi(network.endpoint);

      await this.api.init();
      this.networkMeta = {
        chain: this.api.getRuntimeChain(),
        specName: this.api.getSpecName(),
        genesisHash: this.api.getGenesisHash(),
      };

      if (network.chainId !== this.api.getChainId().toString()) {
        const err = new Error(
          `Network chainId doesn't match expected chainId. expected="${
            network.chainId
          }" actual="${this.api.getChainId()}`,
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

  get api(): EthereumApi {
    return this._api;
  }

  private set api(value: EthereumApi) {
    this._api = value;
  }
}
