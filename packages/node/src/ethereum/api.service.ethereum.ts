// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
import SafeEthProvider from './safe-api';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

@Injectable()
export class EthereumApiService extends ApiService<
  EthereumApi,
  SafeEthProvider,
  EthereumBlockWrapper
> {
  constructor(
    @Inject('ISubqueryProject') private project: SubqueryProject,
    connectionPoolService: ConnectionPoolService<EthereumApiConnection>,
    private eventEmitter: EventEmitter2,
  ) {
    super(connectionPoolService);
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

      const endpointToApiIndex: Record<string, EthereumApiConnection> = {};

      for await (const [i, endpoint] of endpoints.entries()) {
        const connection = await EthereumApiConnection.create(
          endpoint,
          this.fetchBlockBatches,
          this.eventEmitter,
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

      await this.connectionPoolService.addBatchToConnections(
        endpointToApiIndex,
      );

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
    return this.unsafeApi;
  }

  safeApi(height: number): SafeEthProvider {
    const maxRetries = 5;

    const retryErrorCodes = [
      'UNKNOWN_ERROR',
      'NOT_IMPLEMENTED',
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'TIMEOUT',
      'BAD_DATA',
      'CANCELLED',
    ];

    const handler: ProxyHandler<SafeEthProvider> = {
      get: (target, prop, receiver) => {
        const originalMethod = target[prop as keyof SafeEthProvider];
        if (typeof originalMethod === 'function') {
          return async (...args: any[]) => {
            let retries = 0;
            let currentApi = target;
            let throwingError: Error;

            while (retries < maxRetries) {
              try {
                return await originalMethod.apply(currentApi, args);
              } catch (error: any) {
                // other than retryErrorCodes, other errors does not have anything to do with network request, retrying would not change its outcome
                if (!retryErrorCodes.includes(error?.code)) {
                  throw error;
                }

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
    api: EthereumApi,
    batch: number[],
  ): Promise<EthereumBlockWrapper[]> {
    return api.fetchBlocks(batch);
  }
}
