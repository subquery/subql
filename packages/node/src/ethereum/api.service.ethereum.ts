// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiService,
  ConnectionPoolService,
  getLogger,
  NodeConfig,
  profilerWrap,
  IBlock,
  exitWithError,
} from '@subql/node-core';
import { IEndpointConfig } from '@subql/types-core';
import {
  EthereumBlock,
  EthereumNetworkConfig,
  IEthereumEndpointConfig,
  LightEthereumBlock,
} from '@subql/types-ethereum';
import { EthereumNodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { isOnlyEventHandlers } from '../utils/project';
import {
  EthereumApiConnection,
  FetchFunc,
  GetFetchFunc,
} from './api.connection';
import { EthereumApi } from './api.ethereum';
import SafeEthProvider from './safe-api';

const logger = getLogger('api');

@Injectable()
export class EthereumApiService extends ApiService<
  EthereumApi,
  SafeEthProvider,
  IBlock<EthereumBlock>[] | IBlock<LightEthereumBlock>[],
  EthereumApiConnection,
  IEthereumEndpointConfig
> {
  private fetchBlocksFunction?: FetchFunc;
  private fetchBlocksBatches: GetFetchFunc = () => {
    assert(this.fetchBlocksFunction, 'Fetch blocks function is not defined');
    return this.fetchBlocksFunction;
  };
  private nodeConfig: EthereumNodeConfig;

  private constructor(
    @Inject('ISubqueryProject') private project: SubqueryProject,
    connectionPoolService: ConnectionPoolService<EthereumApiConnection>,
    eventEmitter: EventEmitter2,
    nodeConfig: NodeConfig,
  ) {
    super(connectionPoolService, eventEmitter);
    this.nodeConfig = new EthereumNodeConfig(nodeConfig);

    this.updateBlockFetching();
  }

  static async init(
    project: SubqueryProject,
    connectionPoolService: ConnectionPoolService<EthereumApiConnection>,
    eventEmitter: EventEmitter2,
    nodeConfig: NodeConfig,
  ): Promise<EthereumApiService> {
    let network: EthereumNetworkConfig;
    try {
      network = project.network;
    } catch (e) {
      exitWithError(new Error(`Failed to init api`, { cause: e }), logger);
    }

    if (nodeConfig.primaryNetworkEndpoint) {
      const [endpoint, config] = nodeConfig.primaryNetworkEndpoint;
      (network.endpoint as Record<string, IEndpointConfig>)[endpoint] = config;
    }

    const ethNodeConfig = new EthereumNodeConfig(nodeConfig);

    const apiService = new EthereumApiService(
      project,
      connectionPoolService,
      eventEmitter,
      nodeConfig,
    );

    await apiService.createConnections(network, (endpoint, config) =>
      EthereumApiConnection.create(
        endpoint,
        ethNodeConfig.blockConfirmations,
        apiService.fetchBlocksBatches,
        eventEmitter,
        nodeConfig.unfinalizedBlocks,
        config,
      ),
    );

    return apiService;
  }

  protected metadataMismatchError(
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
          return async (
            ...args: Parameters<typeof originalMethod>
          ): Promise<ReturnType<typeof originalMethod>> => {
            let retries = 0;
            let currentApi = target;
            let throwingError: Error | undefined;

            while (retries < maxRetries) {
              try {
                return await (originalMethod as Function).apply(
                  currentApi,
                  args,
                );
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
            if (!throwingError) {
              throw new Error('Failed to make request, maximum retries failed');
            }
            throw throwingError;
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    };

    return new Proxy(this.unsafeApi.getSafeApi(height), handler);
  }

  private async fetchFullBlocksBatch(
    api: EthereumApi,
    batch: number[],
  ): Promise<IBlock<EthereumBlock>[]> {
    return api.fetchBlocks(batch);
  }

  private async fetchLightBlocksBatch(
    api: EthereumApi,
    batch: number[],
  ): Promise<IBlock<LightEthereumBlock>[]> {
    return api.fetchBlocksLight(batch);
  }

  updateBlockFetching(): void {
    const onlyEventHandlers = isOnlyEventHandlers(this.project);
    const skipTransactions =
      this.nodeConfig.skipTransactions && onlyEventHandlers;

    if (this.nodeConfig.skipTransactions) {
      if (onlyEventHandlers) {
        logger.info(
          'skipTransactions is enabled, only events and block headers will be fetched.',
        );
      } else {
        logger.info(
          `skipTransactions is disabled, the project contains handlers that aren't event handlers.`,
        );
      }
    } else {
      if (onlyEventHandlers) {
        logger.warn(
          'skipTransactions is disabled, the project contains only event handlers, it could be enabled to improve indexing performance.',
        );
      } else {
        logger.info(`skipTransactions is disabled.`);
      }
    }

    const fetchFunc = skipTransactions
      ? this.fetchLightBlocksBatch.bind(this)
      : this.fetchFullBlocksBatch.bind(this);

    if (this.nodeConfig?.profiler) {
      this.fetchBlocksFunction = profilerWrap(
        fetchFunc,
        'SubstrateUtil',
        'fetchBlocksBatches',
      ) as FetchFunc;
    } else {
      this.fetchBlocksFunction = fetchFunc;
    }
  }
}
