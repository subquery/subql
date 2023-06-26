// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {OnApplicationShutdown, Injectable} from '@nestjs/common';
import {Interval} from '@nestjs/schedule';
import chalk from 'chalk';
import {IApiConnectionSpecific} from '..';
import {getLogger} from '../logger';
import {ConnectionPoolStateManager} from './connectionPoolState.manager';

const logger = getLogger('connection-pool');

const MAX_FAILURES = 5;
const LOG_INTERVAL_MS = 60 * 1000; // Log every 60 seconds
const RESPONSE_TIME_WEIGHT = 0.7;
const FAILURE_WEIGHT = 0.3;
const RETRY_DELAY = 60 * 1000;

export enum ApiErrorType {
  Timeout = 'timeout',
  Connection = 'connection',
  RateLimit = 'ratelimit',
  Default = 'default',
}

export class ApiConnectionError extends Error {
  errorType: ApiErrorType;

  constructor(name: string, message: string, errorType: ApiErrorType) {
    super(message);
    this.name = name;
    this.errorType = errorType;
  }
}

@Injectable()
export class ConnectionPoolService<T extends IApiConnectionSpecific<any, any, any>> implements OnApplicationShutdown {
  private allApi: T[] = [];
  private apiToIndexMap: Map<T, number> = new Map();
  private cachedApiIndex: number | undefined;
  private reconnectingIndices: Record<number, boolean> = {};

  private errorTypeToScoreAdjustment = {
    [ApiErrorType.Timeout]: -10,
    [ApiErrorType.Connection]: -20,
    [ApiErrorType.RateLimit]: -10,
    [ApiErrorType.Default]: -5,
  };

  constructor(private poolStateManager: ConnectionPoolStateManager<T>) {}

  async onApplicationShutdown(): Promise<void> {
    this.poolStateManager.shutdown();
    await Promise.all(this.allApi.map((api) => api.apiDisconnect()));
  }

  async addToConnections(api: T, endpoint: string): Promise<void> {
    const index = this.allApi.length;
    this.allApi.push(api);
    await this.poolStateManager.addToConnections(endpoint, index);
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
                await new Promise((resolve) => setTimeout(resolve, backoffDelay));
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
          await this.poolStateManager.deleteFromPool(apiIndex);
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

  async handleApiError(apiIndex: number, error: ApiConnectionError): Promise<void> {
    await this.poolStateManager.handleApiError(apiIndex, error.errorType);
    await this.handleConnectionStateChange();
  }

  async handleApiSuccess(apiIndex: number, responseTime: number): Promise<void> {
    await this.poolStateManager.handleApiSuccess(apiIndex, responseTime);
    await this.handleConnectionStateChange();
  }

  async handleConnectionStateChange(): Promise<void> {
    // Update the cached value
    await this.updateNextConnectedApiIndex();
    //TODO: get disconnected indices that are not reconnecting
    //call handle api disconnects on this indices
    const disconnectedIndices = await this.poolStateManager.getDisconnectedIndices();
    disconnectedIndices.map((index) => {
      if (this.reconnectingIndices[index]) {
        return;
      }
      this.handleApiDisconnects(index);
      this.reconnectingIndices[index] = true;
    });
  }
}
