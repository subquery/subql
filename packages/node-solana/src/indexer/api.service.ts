// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection, ConnectionConfig } from '@solana/web3.js';
import * as web3 from '@solana/web3.js';
import { SubquerySolanaProject } from '../configure/project.model';
import { getLogger } from '../utils/logger';
import { NetworkMetadataPayload } from './events';

const logger = getLogger('api');

@Injectable()
export class ApiService {
  private api: Connection;
  private currentBlockHash: string;
  private clientConfig: ConnectionConfig;
  networkMeta: NetworkMetadataPayload;

  constructor(
    protected project: SubquerySolanaProject,
    private eventEmitter: EventEmitter2,
  ) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(): Promise<ApiService> {
    const { network } = this.project;
    this.clientConfig = {
      commitment: 'finalized',
    };

    this.api = new Connection(web3.clusterApiUrl('testnet'), {
      commitment: 'finalized',
    });

    this.networkMeta = {
      chainId: network.chainId,
    };

    return this;
  }

  getApi(): Connection {
    return this.api;
  }
}
