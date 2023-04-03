// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectNetworkV1_0_0 } from '@subql/common-ethereum';
import {
  ApiService,
  ConnectionPoolService,
  getLogger,
  IndexerEvent,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApiConnection } from './api.connection';
import { EthereumApi } from './api.ethereum';

const logger = getLogger('api');

@Injectable()
export class EthereumApiService extends ApiService {
  constructor(
    @Inject('ISubqueryProject') project: SubqueryProject,
    private connectionPoolService: ConnectionPoolService<EthereumApiConnection>,
    private eventEmitter: EventEmitter2,
  ) {
    super(project);
  }

  async init(): Promise<EthereumApiService> {
    try {
      let network: ProjectNetworkV1_0_0;
      try {
        network = this.project.network;
      } catch (e) {
        logger.error(Object.keys(e));
        process.exit(1);
      }

      const endpoints = Array.isArray(network.endpoint)
        ? network.endpoint
        : [network.endpoint];

      const connections = await Promise.all(
        endpoints.map(async (endpoint, i) => {
          const connection = await EthereumApiConnection.create(
            endpoint,
            this.eventEmitter,
          );

          const { api } = connection;

          this.eventEmitter.emit(IndexerEvent.ApiConnected, {
            value: 1,
            apiIndex: i,
            endpoint: endpoint,
          });

          // api.on('connected', () => {
          //   this.eventEmitter.emit(IndexerEvent.ApiConnected, {
          //     value: 1,
          //     apiIndex: i,
          //     endpoint: endpoint,
          //   });
          // });
          // api.on('disconnected', () => {
          //   this.eventEmitter.emit(IndexerEvent.ApiConnected, {
          //     value: 0,
          //     apiIndex: i,
          //     endpoint: endpoint,
          //   });
          //   void this.connectionPoolService.handleApiDisconnects(i, endpoint);
          // });
          if (!this.networkMeta) {
            this.networkMeta = {
              chain: api.getRuntimeChain(),
              specName: api.getSpecName(),
              genesisHash: api.getGenesisHash(),
            };
          }

          if (network.chainId !== api.getChainId().toString()) {
            throw this.metadataMismatchError(
              'ChainId',
              this.networkMeta.genesisHash,
              api.getRuntimeChain(),
            );
          }

          return connection;
        }),
      );

      this.connectionPoolService.addBatchToConnections(connections);

      return this;
    } catch (e) {
      logger.error(e, 'Failed to init api service');
      process.exit(1);
    }
  }

  private metadataMismatchError(
    metadata: string,
    expected: string,
    actual: string,
  ): Error {
    return Error(
      `Value of ${metadata} does not match across all endpoints. Please check that your endpoints are for the same network.\n
       Expected: ${expected}
       Actual: ${actual}`,
    );
  }

  get api(): EthereumApi {
    return this.connectionPoolService.api.api;
  }
}
