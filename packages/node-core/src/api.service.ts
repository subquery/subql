// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {EventEmitter2} from '@nestjs/event-emitter';
import {normalizeNetworkEndpoints} from '@subql/common';
import {IEndpointConfig, ProjectNetworkConfig} from '@subql/types-core';
import {ApiConnectionError, ApiErrorType, MetadataMismatchError} from './api.connection.error';
import {IndexerEvent, NetworkMetadataPayload} from './events';
import {ConnectionPoolService} from './indexer';
import {getLogger} from './logger';
import {backoffRetry, isBackoffError} from './utils';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

export interface IApi<A = any, SA = any, B extends Array<any> = any[]> {
  fetchBlocks(heights: number[], ...args: any): Promise<B>;
  safeApi(height: number): SA;
  unsafeApi: A;
  readonly networkMeta: NetworkMetadataPayload;
}

export interface IApiConnectionSpecific<A = any, SA = any, B extends Array<any> = any[]> extends IApi<A, SA, B> {
  handleError(error: Error): ApiConnectionError;
  apiConnect(): Promise<void>;
  apiDisconnect(): Promise<void>;
  updateChainTypes?(chainTypes: unknown): Promise<void>;
}

export abstract class ApiService<
  A = any,
  SA = any,
  B extends Array<any> = any[],
  Connection extends IApiConnectionSpecific<A, SA, B> = IApiConnectionSpecific<A, SA, B>,
  EndpointConfig extends IEndpointConfig = IEndpointConfig,
> implements IApi<A, SA, B>
{
  constructor(
    protected connectionPoolService: ConnectionPoolService<Connection>,
    protected eventEmitter: EventEmitter2
  ) {}

  private _networkMeta?: NetworkMetadataPayload;

  get networkMeta(): NetworkMetadataPayload {
    assert(!!this._networkMeta, 'ApiService has not been init');
    return this._networkMeta;
  }

  private connectionRetrys: Record<string, Promise<void> | undefined> = {};

  async fetchBlocks(heights: number[], numAttempts = MAX_RECONNECT_ATTEMPTS): Promise<B> {
    return this.retryFetch(async () => {
      // Get the latest fetch function from the provider
      const apiInstance = this.connectionPoolService.api;
      return apiInstance.fetchBlocks(heights);
    }, numAttempts);
  }

  protected async retryFetch(fn: () => Promise<B>, numAttempts = MAX_RECONNECT_ATTEMPTS): Promise<B> {
    try {
      return await backoffRetry(fn, numAttempts);
    } catch (e) {
      if (isBackoffError(e)) {
        logger.error(e.message);
        throw e.lastError;
      }
      throw e;
    }
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
    network: ProjectNetworkConfig<EndpointConfig> & {chainId: string},
    createConnection: (endpoint: string, config: EndpointConfig) => Promise<Connection>,
    /* Used to monitor the state of the connection */
    postConnectedHook?: (connection: Connection, endpoint: string, index: number) => void
  ): Promise<void> {
    const endpointToApiIndex: Record<string, Connection> = {};

    const failedConnections: Map<number, [string, EndpointConfig]> = new Map();

    const endpoints = normalizeNetworkEndpoints<EndpointConfig>(network.endpoint);

    const connectionPromises = Object.entries(endpoints).map(async ([endpoint, config], i) => {
      try {
        const connection = await this.performConnection(
          createConnection,
          network,
          i,
          endpoint,
          config,
          postConnectedHook
        );

        void this.connectionPoolService.addToConnections(connection, endpoint);
      } catch (e) {
        logger.error(`Failed to init ${endpoint}: ${e}`);
        endpointToApiIndex[endpoint] = null as unknown as Connection;

        // Don't reconnect if connection is for wrong network
        if (!(e instanceof MetadataMismatchError)) {
          failedConnections.set(i, [endpoint, config]);
        }

        throw e;
      }
    });

    try {
      await Promise.any(connectionPromises);
    } catch (e) {
      throw new Error('All endpoints failed to initialize. Please add healthier endpoints', {cause: e});
    }

    void Promise.allSettled(connectionPromises).then((res) => {
      // Retry failed connections in the background
      for (const [index, [endpoint, config]] of failedConnections) {
        this.retryConnection(createConnection, network, index, endpoint, config, postConnectedHook);
      }
    });
  }

  private async performConnection(
    createConnection: (endpoint: string, config: EndpointConfig) => Promise<Connection>,
    network: ProjectNetworkConfig & {chainId: string},
    index: number,
    endpoint: string,
    config: EndpointConfig,
    postConnectedHook?: (connection: Connection, endpoint: string, index: number) => void
  ): Promise<Connection> {
    const connection = await createConnection(endpoint, config);

    this.assertChainId(network, connection);
    if (!this._networkMeta) {
      this._networkMeta = connection.networkMeta;
    }

    this.eventEmitter.emit(IndexerEvent.ApiConnected, {
      value: 1,
      apiIndex: index,
      endpoint: endpoint,
    });

    if (postConnectedHook) {
      postConnectedHook(connection, endpoint, index);
    }

    return connection;
  }

  retryConnection(...args: Parameters<ApiService<A, SA, B, Connection, EndpointConfig>['performConnection']>): void {
    const endpoint = args[3];
    this.connectionRetrys[endpoint] = backoffRetry(async () => {
      try {
        const connection = await this.performConnection(...args);

        // Replace null connection with the new connection
        await this.connectionPoolService.updateConnection(connection, endpoint);
        logger.info(`Updated connection for ${endpoint}`);
      } catch (e) {
        logger.error(`Initialization retry failed for ${endpoint}: ${e}`);
        throw e;
      }
    }, 5).catch((e) => {
      logger.error(e, `Initialization retry attempts exhausted for ${endpoint}`);
    });
  }

  handleError(error: Error): ApiConnectionError {
    return new ApiConnectionError(error.name, error.message, ApiErrorType.Default);
  }

  /**
   * Override this if the network uses another value like genesisHash
   * */
  protected assertChainId(network: ProjectNetworkConfig & {chainId: string}, connection: IApiConnectionSpecific): void {
    if (network.chainId !== connection.networkMeta.chain) {
      throw new MetadataMismatchError('ChainId', network.chainId, connection.networkMeta.chain);
    }
  }
}
