// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'node:worker_threads';
import {OnApplicationShutdown, Injectable} from '@nestjs/common';
import {Interval} from '@nestjs/schedule';
import chalk from 'chalk';
import {ApiConnectionError, ApiErrorType} from '../api.connection.error';
import {IApiConnectionSpecific} from '../api.service';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {delay} from '../utils';
import {ConnectionPoolStateManager} from './connectionPoolState.manager';

const logger = getLogger('connection-pool');

const LOG_INTERVAL_MS = 60 * 1000; // Log every 60 seconds

export const errorTypeToScoreAdjustment = {
  [ApiErrorType.Timeout]: -10,
  [ApiErrorType.Connection]: -20,
  [ApiErrorType.RateLimit]: -10,
  [ApiErrorType.Default]: -5,
};

type ResultCacheEntry<T> = {
  apiIndex: number;
  type: 'success' | 'error';
  data: T;
};

@Injectable()
export class ConnectionPoolService<T extends IApiConnectionSpecific<any, any, any>> implements OnApplicationShutdown {
  private allApi: T[] = [];
  private apiToIndexMap: Map<T, number> = new Map();
  private cachedApiIndex: number | undefined;
  private reconnectingIndices: Record<number, boolean> = {};
  private resultCache: Array<ResultCacheEntry<number | ApiConnectionError['errorType']>> = [];
  private lastCacheFlushTime: number = Date.now();
  private cacheSizeThreshold = 10;
  private cacheFlushInterval = 60 * 100;

  constructor(nodeConfig: NodeConfig, private poolStateManager: ConnectionPoolStateManager<T>) {
    this.cacheSizeThreshold = nodeConfig.batchSize;
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.allApi.map((api) => api.apiDisconnect()));
  }

  async addToConnections(api: T, endpoint: string, primary = false): Promise<void> {
    const index = this.allApi.length;
    this.allApi.push(api);
    await this.poolStateManager.addToConnections(endpoint, index, primary);
    this.apiToIndexMap.set(api, index);
    await this.updateNextConnectedApiIndex();
  }

  async addBatchToConnections(endpointToApiIndex: Record<string, T>): Promise<void> {
    for (const endpoint in endpointToApiIndex) {
      await this.addToConnections(endpointToApiIndex[endpoint], endpoint);
    }
  }

  async connectToApi(apiIndex: number): Promise<void> {
    await this.allApi[apiIndex].apiConnect();
  }

  private async updateNextConnectedApiIndex(): Promise<void> {
    this.cachedApiIndex = await this.poolStateManager.getNextConnectedApiIndex();
  }

  get api(): T {
    const index = this.cachedApiIndex;

    if (index === undefined) {
      throw new Error(
        'All endpoints in the pool are either suspended due to rate limits or attempting to reconnect. Please wait or add healthier endpoints.'
      );
    }
    const api = this.allApi[index];

    const wrappedApi = new Proxy(api, {
      get: (target, prop, receiver) => {
        if (prop === 'fetchBlocks') {
          return async (heights: number[], ...args: any): Promise<any> => {
            try {
              // Check if the endpoint is rate-limited
              if (await this.poolStateManager.getFieldValue(index, 'rateLimited')) {
                logger.info('throtling on ratelimited endpoint');
                const backoffDelay = await this.poolStateManager.getFieldValue(index, 'backoffDelay');
                await delay(backoffDelay);
              }

              const start = Date.now();
              const result = await target.fetchBlocks(heights, ...args);
              const end = Date.now();
              await this.handleApiSuccess(index, end - start);
              await this.poolStateManager.setFieldValue(index, 'lastRequestTime', end); // Update the last request time
              return result;
            } catch (error) {
              await this.handleApiError(index, target.handleError(error as Error));
              throw error;
            }
          };
        }

        // Delegate other property access and method calls to the original api object
        return Reflect.get(target, prop, receiver);
      },
    });
    return wrappedApi as T;
  }

  get numConnections(): number {
    return this.poolStateManager.numConnections;
  }

  async handleApiDisconnects(apiIndex: number): Promise<void> {
    const endpoint = await this.poolStateManager.getFieldValue(apiIndex, 'endpoint');

    logger.warn(`disconnected from ${endpoint}`);

    const maxAttempts = 5;
    let currentAttempt = 1;

    const tryReconnect = async () => {
      logger.info(`Attempting to reconnect to ${endpoint} (attempt ${currentAttempt})`);

      try {
        await this.allApi[apiIndex].apiConnect();
        await this.poolStateManager.setFieldValue(apiIndex, 'connected', true);
        logger.info(`Reconnected to ${endpoint} successfully`);
      } catch (error) {
        if (currentAttempt < maxAttempts) {
          logger.error(`Reconnection failed: ${error}`);

          const delay = 2 ** currentAttempt * 1000;
          currentAttempt += 1;

          setTimeout(() => {
            tryReconnect();
          }, delay);
        } else {
          logger.error(`Reached max reconnection attempts. Removing connection ${endpoint} from pool.`);
          await this.poolStateManager.removeFromConnections(apiIndex);
        }
      }
    };

    await tryReconnect();

    await this.poolStateManager.setFieldValue(apiIndex, 'connected', true);
    this.reconnectingIndices[apiIndex] = false;
    await this.handleConnectionStateChange();
    logger.info(`reconnected to ${endpoint}!`);
  }

  @Interval(LOG_INTERVAL_MS)
  async logEndpointStatus(): Promise<void> {
    if (!isMainThread) {
      return;
    }
    const suspendedIndices = await this.poolStateManager.getSuspendedIndices();

    if (suspendedIndices.length === 0) {
      return;
    }

    let suspendedEndpointsInfo = chalk.yellow('Suspended endpoints:\n');

    await Promise.all(
      suspendedIndices.map(async (index) => {
        const endpoint = chalk.cyan(new URL(await this.poolStateManager.getFieldValue(index, 'endpoint')).hostname);
        const failures = chalk.red(`Failures: ${await this.poolStateManager.getFieldValue(index, 'failureCount')}`);
        const backoff = chalk.yellow(
          `Backoff (ms): ${await this.poolStateManager.getFieldValue(index, 'backoffDelay')}`
        );

        suspendedEndpointsInfo += `\n- ${endpoint}\n  ${failures}\n  ${backoff}\n`;
      })
    );

    logger.info(suspendedEndpointsInfo);
  }

  async handleApiSuccess(apiIndex: number, responseTime: number): Promise<void> {
    this.addToResultCache(apiIndex, 'success', responseTime);
    await this.flushResultCacheIfNeeded();
    await this.handleConnectionStateChange();
  }

  async handleApiError(apiIndex: number, error: ApiConnectionError): Promise<void> {
    this.addToResultCache(apiIndex, 'error', error.errorType);
    await this.flushResultCacheIfNeeded();
    await this.handleConnectionStateChange();
  }

  async handleConnectionStateChange(): Promise<void> {
    // Update the cached value
    await this.updateNextConnectedApiIndex();
    const disconnectedIndices = await this.poolStateManager.getDisconnectedIndices();
    disconnectedIndices.map((index) => {
      if (this.reconnectingIndices[index]) {
        return;
      }
      this.handleApiDisconnects(index);
      this.reconnectingIndices[index] = true;
    });
  }

  private addToResultCache(
    apiIndex: number,
    dataType: 'success' | 'error',
    data: number | ApiConnectionError['errorType']
  ): void {
    const entry: ResultCacheEntry<number | ApiConnectionError['errorType']> = {
      apiIndex,
      type: dataType,
      data,
    };
    this.resultCache.push(entry);
  }

  private async flushResultCacheIfNeeded(): Promise<void> {
    const currentTime = Date.now();
    const timeSinceLastFlush = currentTime - this.lastCacheFlushTime;

    if (this.resultCache.length >= this.cacheSizeThreshold || timeSinceLastFlush >= this.cacheFlushInterval) {
      await this.flushResultCache();
    }
  }

  private async flushResultCache(): Promise<void> {
    const successResults: Array<{apiIndex: number; responseTime: number}> = [];
    const errorResults: Array<{apiIndex: number; errorType: ApiErrorType}> = [];

    for (const result of this.resultCache) {
      if (result.type === 'success') {
        successResults.push({apiIndex: result.apiIndex, responseTime: result.data as number});
      } else {
        errorResults.push({apiIndex: result.apiIndex, errorType: result.data as ApiErrorType});
      }
    }

    await this.poolStateManager.handleBatchApiSuccess(successResults);
    await this.poolStateManager.handleBatchApiError(errorResults);

    this.resultCache = [];
    this.lastCacheFlushTime = Date.now();
    await this.handleConnectionStateChange();
  }
}
