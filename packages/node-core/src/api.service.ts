// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {EventEmitter2} from '@nestjs/event-emitter';
import {ProjectNetworkConfig} from '@subql/types-core';
import {ApiConnectionError, ApiErrorType} from './api.connection.error';
import {IndexerEvent, NetworkMetadataPayload} from './events';
import {ConnectionPoolService} from './indexer';
import {getLogger} from './logger';
import {backoffRetry, isBackoffError, raceFulfilled} from './utils';

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
}

export abstract class ApiService<A = any, SA = any, B extends Array<any> = any[]> implements IApi<A, SA, B> {
  constructor(
    protected connectionPoolService: ConnectionPoolService<IApiConnectionSpecific<A, SA, B>>,
    protected eventEmitter: EventEmitter2
  ) {}

  private _networkMeta?: NetworkMetadataPayload;

  get networkMeta(): NetworkMetadataPayload {
    assert(this._networkMeta, 'ApiService has not been init');
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
    network: ProjectNetworkConfig & {chainId: string},
    createConnection: (endpoint: string) => Promise<IApiConnectionSpecific<A, SA, B>>,
    getChainId: (connection: IApiConnectionSpecific) => Promise<string>,
    postConnectedHook?: (connection: IApiConnectionSpecific, endpoint: string, index: number) => void
  ): Promise<void> {
    const endpointToApiIndex: Record<string, IApiConnectionSpecific<A, SA, B>> = {};

    const failedConnections: Map<number, string> = new Map();

    const connectionPromises = (network.endpoint as string[]).map(async (endpoint, i) => {
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

        if (!this._networkMeta) {
          this._networkMeta = connection.networkMeta;
        }

        const chainId = await getChainId(connection);

        if (network.chainId !== chainId) {
          throw this.metadataMismatchError('ChainId', network.chainId, chainId);
        }

        void this.connectionPoolService.addToConnections(connection, endpoint);
      } catch (e) {
        logger.error(`Failed to init ${endpoint}: ${e}`);
        endpointToApiIndex[endpoint] = null as unknown as IApiConnectionSpecific<A, SA, B>;
        failedConnections.set(i, endpoint);
        throw e;
      }
    });

    try {
      const {fulfilledIndex, result} = (await raceFulfilled(connectionPromises)) as {
        result: void;
        fulfilledIndex: number;
      };
      connectionPromises.splice(fulfilledIndex, 1);
    } catch (e) {
      throw new Error('All endpoints failed to initialize. Please add healthier endpoints');
    }

    void Promise.allSettled(connectionPromises).then((res) => {
      // Retry failed connections in the background
      for (const [index, endpoint] of failedConnections) {
        this.retryConnection(createConnection, getChainId, network, index, endpoint, postConnectedHook);
      }
    });
  }

  async performConnection(
    createConnection: (endpoint: string) => Promise<IApiConnectionSpecific<A, SA, B>>,
    getChainId: (connection: IApiConnectionSpecific) => Promise<string>,
    network: ProjectNetworkConfig & {chainId: string},
    index: number,
    endpoint: string,
    postConnectedHook?: (connection: IApiConnectionSpecific, endpoint: string, index: number) => void
  ): Promise<void> {
    const connection = await createConnection(endpoint);
    const chainId = await getChainId(connection);

    if (postConnectedHook) {
      postConnectedHook(connection, endpoint, index);
    }

    if (network.chainId === chainId) {
      // Replace null connection with the new connection
      await this.connectionPoolService.updateConnection(connection, endpoint);
      logger.info(`Updated connection for ${endpoint}`);
    } else {
      throw this.metadataMismatchError('ChainId', network.chainId, chainId);
    }
  }

  retryConnection(
    createConnection: (endpoint: string) => Promise<IApiConnectionSpecific<A, SA, B>>,
    getChainId: (connection: IApiConnectionSpecific) => Promise<string>,
    network: ProjectNetworkConfig & {chainId: string},
    index: number,
    endpoint: string,
    postConnectedHook?: (connection: IApiConnectionSpecific, endpoint: string, index: number) => void
  ): void {
    this.connectionRetrys[endpoint] = backoffRetry(async () => {
      try {
        await this.performConnection(createConnection, getChainId, network, index, endpoint, postConnectedHook);
      } catch (e) {
        logger.error(`Initialization retry failed for ${endpoint}: ${e}`);
        throw e;
      }
    }, 5).catch((e) => {
      logger.error(e, `Initialization retry attempts exhausted for ${endpoint}`);
    });
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
