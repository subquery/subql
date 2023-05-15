// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectNetworkV1_0_0 } from '@subql/common-ethereum';
import {
  ApiService,
  ConnectionPoolService,
  NetworkMetadataPayload,
  getLogger,
  IndexerEvent,
} from '@subql/node-core';
import { EthereumBlockWrapper } from '@subql/types-ethereum';
import { SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApiConnection } from './api.connection';
import { EthereumApi } from './api.ethereum';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

@Injectable()
export class EthereumApiService extends ApiService {
  constructor(
    @Inject('ISubqueryProject') project: SubqueryProject,
    private connectionPoolService: ConnectionPoolService<EthereumApiConnection>,
    private eventEmitter: EventEmitter2,
  ) {
    super(project);
  }

  networkMeta: NetworkMetadataPayload;

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
              chain: api.getChainId().toString(),
              specName: api.getSpecName(),
              genesisHash: api.getGenesisHash(),
            };
          }

          if (network.chainId !== api.getChainId().toString()) {
            throw this.metadataMismatchError(
              'ChainId',
              network.chainId,
              api.getChainId().toString(),
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

  async fetchBlocks(batch: number[]): Promise<EthereumBlockWrapper[]> {
    return this.fetchBlocksGeneric<EthereumBlockWrapper>(
      () => (b: number[]) => this.api.fetchBlocks(b),
      batch,
    );
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
