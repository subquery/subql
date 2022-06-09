// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { ProjectNetworkV1_0_0 } from '@subql/common-avalanche';
import { ApiService, getLogger } from '@subql/node-core';
import { AvalancheApi } from './api.avalanche';

const logger = getLogger('api');

@Injectable()
export class AvalancheApiService extends ApiService {
  private _api: AvalancheApi;

  async init(): Promise<AvalancheApiService> {
    let network: ProjectNetworkV1_0_0;
    try {
      network = this.project.network;
    } catch (e) {
      logger.error(Object.keys(e));
      process.exit(1);
    }
    logger.info(JSON.stringify(this.project.network));

    this.api = new AvalancheApi(network);
    await this.api.init();
    this.networkMeta = {
      chain: this.api.getRuntimeChain(),
      specName: this.api.getSpecName(),
      genesisHash: this.api.getGenesisHash(),
    };

    if (network.chainId !== this.api.getChainId()) {
      const err = new Error(
        `Network chainId doesn't match expected chainId. expected="${
          network.chainId
        }" actual="${this.api.getChainId()}`,
      );
      logger.error(err, err.message);
      throw err;
    }

    return this;
  }

  get api(): AvalancheApi {
    return this._api;
  }

  private set api(value: AvalancheApi) {
    this._api = value;
  }
}
