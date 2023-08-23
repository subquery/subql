// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectNetworkV1_0_0 } from '@subql/common-stellar';
import {
  ApiService,
  ConnectionPoolService,
  NetworkMetadataPayload,
  getLogger,
  IndexerEvent,
} from '@subql/node-core';
import { StellarBlockWrapper } from '@subql/types-stellar';
import { SubqueryProject } from '../configure/SubqueryProject';
import { StellarApiConnection } from './api.connection';
import { StellarApi } from './api.stellar';
import SafeStellarProvider from './safe-api';
import { SorobanServer } from './soroban.server';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

@Injectable()
export class StellarApiService extends ApiService<
  StellarApi,
  SafeStellarProvider,
  StellarBlockWrapper
> {
  constructor(
    @Inject('ISubqueryProject') private project: SubqueryProject,
    connectionPoolService: ConnectionPoolService<StellarApiConnection>,
    private eventEmitter: EventEmitter2,
  ) {
    super(connectionPoolService);
  }

  networkMeta: NetworkMetadataPayload;

  async init(): Promise<StellarApiService> {
    try {
      let network: ProjectNetworkV1_0_0;
      try {
        network = this.project.network;
      } catch (e) {
        logger.error(Object.keys(e));
        process.exit(1);
      }

      const sorobanClient = network.soroban
        ? new SorobanServer(network.soroban)
        : undefined;

      const endpoints = Array.isArray(network.endpoint)
        ? network.endpoint
        : [network.endpoint];

      const endpointToApiIndex: Record<string, StellarApiConnection> = {};

      for await (const [i, endpoint] of endpoints.entries()) {
        const connection = await StellarApiConnection.create(
          endpoint,
          this.fetchBlockBatches,
          this.eventEmitter,
          sorobanClient,
        );

        const api = connection.unsafeApi;

        this.eventEmitter.emit(IndexerEvent.ApiConnected, {
          value: 1,
          apiIndex: i,
          endpoint: endpoint,
        });

        if (!this.networkMeta) {
          this.networkMeta = connection.networkMeta;
        }

        if (network.chainId !== api.getChainId().toString()) {
          throw this.metadataMismatchError(
            'ChainId',
            network.chainId,
            api.getChainId().toString(),
          );
        }

        endpointToApiIndex[endpoint] = connection;
      }

      this.connectionPoolService.addBatchToConnections(endpointToApiIndex);

      return this;
    } catch (e) {
      logger.error(e, 'Failed to init api service');
      throw e;
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

  get api(): StellarApi {
    return this.unsafeApi;
  }

  safeApi(height: number): SafeStellarProvider {
    const maxRetries = 5;

    const handler: ProxyHandler<SafeStellarProvider> = {
      get: (target, prop, receiver) => {
        const originalMethod = target[prop as keyof SafeStellarProvider];
        if (typeof originalMethod === 'function') {
          return async (...args: any[]) => {
            let retries = 0;
            let currentApi = target;
            let throwingError: Error;

            while (retries < maxRetries) {
              try {
                return await originalMethod.apply(currentApi, args);
              } catch (error) {
                logger.warn(
                  `Request failed with api at height ${height} (retry ${retries}): ${error.message}`,
                );
                throwingError = error;
                currentApi = this.unsafeApi.getSafeApi(height);
                retries++;
              }
            }

            logger.error(
              `Maximum retries (${maxRetries}) exceeded for api at height ${height}`,
            );
            throw throwingError;
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    };

    return new Proxy(this.unsafeApi.getSafeApi(height), handler);
  }

  private async fetchBlockBatches(
    api: StellarApi,
    batch: number[],
  ): Promise<StellarBlockWrapper[]> {
    return api.fetchBlocks(batch);
  }
}
