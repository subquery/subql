// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LCDClient, LCDClientConfig } from '@terra-money/terra.js';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { getLogger } from '../utils/logger';
import { NetworkMetadataPayload } from './events';

const logger = getLogger('api');

@Injectable()
export class ApiTerraService {
  private api: LCDClient;
  private currentBlockHash: string;
  private clientConfig: LCDClientConfig;
  networkMeta: NetworkMetadataPayload;

  constructor(
    protected project: SubqueryTerraProject,
    private eventEmitter: EventEmitter2,
  ) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(): Promise<ApiTerraService> {
    const { network } = this.project;
    this.clientConfig = {
      URL: network.endpoint,
      chainID: network.chainId,
    };

    this.api = new LCDClient(this.clientConfig);

    this.networkMeta = {
      chainId: network.chainId,
    };

    const nodeInfo: any = await this.api.tendermint.nodeInfo();

    if (network.chainId !== nodeInfo.default_node_info.network) {
      const err = new Error(
        `The given chainId does not match with client: "${network.chainId}"`,
      );
      logger.error(err, err.message);
      throw err;
    }

    return this;
  }

  getApi(): LCDClient {
    return this.api;
  }
}
