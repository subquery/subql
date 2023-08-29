// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {ProjectNetworkConfig} from '@subql/common';
import {ApiConnectionError, ApiErrorType} from './api.connection.error';
import {IndexerEvent, NetworkMetadataPayload} from './events';
import {ConnectionPoolService} from './indexer';
import {getLogger} from './logger';
import {retryWithBackoff} from './utils';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

export interface IApi<A = any, SA = any, B = any> {
  fetchBlocks(heights: number[], ...args: any): Promise<B[]>;
  safeApi(height: number): SA;
  unsafeApi: A;
  networkMeta: NetworkMetadataPayload;
}

export interface IApiConnectionSpecific<A = any, SA = any, B = any> extends IApi<A, SA, B> {
  handleError(error: Error): ApiConnectionError;
  apiConnect(): Promise<void>;
  apiDisconnect(): Promise<void>;
}

export abstract class ApiService<A = any, SA = any, B = any> implements IApi<A, SA, B> {
  constructor(
    protected connectionPoolService: ConnectionPoolService<IApiConnectionSpecific<A, SA, B>>,
    protected eventEmitter: EventEmitter2
  ) {}

  abstract networkMeta: NetworkMetadataPayload;

  private timeouts: Record<string, NodeJS.Timeout | undefined> = {};

  async fetchBlocks(heights: number[], numAttempts = MAX_RECONNECT_ATTEMPTS): Promise<B[]> {
    let reconnectAttempts = 0;
    while (reconnectAttempts < numAttempts) {
      try {
        // Get the latest fetch function from the provider
        const apiInstance = this.connectionPoolService.api;
        return await apiInstance.fetchBlocks(heights);
      } catch (e: any) {
        logger.error(e, `Failed to fetch blocks ${heights[0]}...${heights[heights.length - 1]}`);

        reconnectAttempts++;
      }
    }
    throw new Error(`Maximum number of retries (${numAttempts}) reached.`);
  }

  get api(): A {
    return this.unsafeApi;
  }

  safeApi(height: number): SA {
    const apiInstance = this.connectionPoolService.api;
    return apiInstance.safeApi(height);
  }

  get unsafeApi(): A {
    const apiInstance = this.connectionPoolService.api;
    return apiInstance.unsafeApi;
  }
  async createConnections(
    network: ProjectNetworkConfig & {chainId: string},
    createConnection: (endpoint: string) => Promise<IApiConnectionSpecific>,
    getChainId: (connection: IApiConnectionSpecific) => Promise<string>,
    postConnectedHook?: (connection: IApiConnectionSpecific, endpoint: string, index: number) => void
  ): Promise<void> {
    const endpointToApiIndex: Record<string, IApiConnectionSpecific> = {};

    const failedConnections: Map<number, string> = new Map();

    for await (const [i, endpoint] of (network.endpoint as string[]).entries()) {
      try {
        const connection = await createConnection(endpoint);
        this.eventEmitter.emit(IndexerEvent.ApiConnected, {
          value: 1,
          apiIndex: i,
          endpoint: endpoint,
        });

        if (postConnectedHook) {
          postConnectedHook(connection, endpoint, i);
        }

        if (!this.networkMeta) {
          this.networkMeta = connection.networkMeta;
        }

        const chainId = await getChainId(connection);

        if (network.chainId !== chainId) {
          throw this.metadataMismatchError('ChainId', network.chainId, chainId);
        }

        endpointToApiIndex[endpoint] = connection;
      } catch (e) {
        logger.error(`Failed to init ${endpoint}: ${e}`);
        endpointToApiIndex[endpoint] = null as unknown as IApiConnectionSpecific;
        failedConnections.set(i, endpoint);
      }
    }

    if (Object.values(endpointToApiIndex).every((value) => value === null)) {
      throw new Error('All endpoints failed to initialize. Please add healthier endpoints');
    }

    await this.connectionPoolService.addBatchToConnections(endpointToApiIndex);

    // Retry failed connections in the background
    for (const [index, endpoint] of failedConnections) {
      this.retryConnection(createConnection, getChainId, network, index, endpoint, postConnectedHook);
    }
  }

  async performConnection(
    createConnection: (endpoint: string) => Promise<IApiConnectionSpecific>,
    getChainId: (connection: IApiConnectionSpecific) => Promise<string>,
    network: ProjectNetworkConfig & {chainId: string},
    index: number,
    endpoint: string,
    postConnectedHook?: (connection: IApiConnectionSpecific, endpoint: string, index: number) => void
  ) {
    const connection = await createConnection(endpoint);
    const chainId = await getChainId(connection);

    if (postConnectedHook) {
      postConnectedHook(connection, endpoint, index);
    }

    if (network.chainId === chainId) {
      // Replace null connection with the new connection
      await this.connectionPoolService.updateConnection(connection, index);
      logger.info(`Updated connection for ${endpoint}`);
    } else {
      throw this.metadataMismatchError('ChainId', network.chainId, chainId);
    }
  }

  retryConnection(
    createConnection: (endpoint: string) => Promise<IApiConnectionSpecific>,
    getChainId: (connection: IApiConnectionSpecific) => Promise<string>,
    network: ProjectNetworkConfig & {chainId: string},
    index: number,
    endpoint: string,
    postConnectedHook?: (connection: IApiConnectionSpecific, endpoint: string, index: number) => void
  ): void {
    this.timeouts[endpoint] = retryWithBackoff(
      () => this.performConnection(createConnection, getChainId, network, index, endpoint, postConnectedHook),
      (error) => {
        logger.error(`Initialization retry failed for ${endpoint}: ${error}`);
      },
      () => {
        logger.error(`Initialization retry attempts exhausted for ${endpoint}`);
      }
    );
  }

  protected metadataMismatchError(metadata: string, expected: string, actual: string): Error {
    return Error(
      `Value of ${metadata} does not match across all endpoints\n
       Expected: ${expected}
       Actual: ${actual}`
    );
  }

  handleError(error: Error): ApiConnectionError {
    return new ApiConnectionError(error.name, error.message, ApiErrorType.Default);
  }
}
