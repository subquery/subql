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
      throw new Error('All of the endpoints are suspended at the moment');
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
              await this.handleConnectionStateChange();
              return result;
            } catch (error) {
              await this.handleApiError(index, target.handleError(error as Error));
              await this.handleConnectionStateChange();
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

  async handleApiDisconnects(apiIndex: number, endpoint: string): Promise<void> {
    logger.warn(`disconnected from ${endpoint}`);

    try {
      logger.debug(`reconnecting to ${endpoint}...`);
      await this.connectToApi(apiIndex);
    } catch (e) {
      logger.error(`unable to reconnect to endpoint ${endpoint}`, e);
      await this.poolStateManager.deleteFromPool(apiIndex);
      await this.handleConnectionStateChange();
      return;
    }

    await this.handleConnectionStateChange();
    logger.info(`reconnected to ${endpoint}!`);
  }

  private calculatePerformanceScore(responseTime: number, failureCount: number): number {
    const responseTimeScore = 1 / responseTime;
    const failureScore = 1 - failureCount / MAX_FAILURES;
    return RESPONSE_TIME_WEIGHT * responseTimeScore + FAILURE_WEIGHT * failureScore;
  }

  @Interval(LOG_INTERVAL_MS)
  async logEndpointStatus(): Promise<void> {
    const suspendedIndices = await this.poolStateManager.getSuspendedIndices();

    if (suspendedIndices.length === 0) {
      logger.info(chalk.green('No suspended endpoints.'));
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
    const adjustment = this.errorTypeToScoreAdjustment[error.errorType] || this.errorTypeToScoreAdjustment.default;
    const performanceScore = await this.poolStateManager.getFieldValue(apiIndex, 'performanceScore');
    await this.poolStateManager.setFieldValue(apiIndex, 'performanceScore', performanceScore + adjustment);
    if ((await this.poolStateManager.getFieldValue(apiIndex, 'backoffDelay')) > 0) {
      //endpoint is alreay suspended, we must be dealing with requests from same batch
      return;
    }
    const failureCount = await this.poolStateManager.getFieldValue(apiIndex, 'failureCount');
    await this.poolStateManager.setFieldValue(apiIndex, 'failureCount', failureCount + 1);

    if (error.errorType !== ApiErrorType.Default) {
      const nextDelay =
        RETRY_DELAY * Math.pow(2, (await this.poolStateManager.getFieldValue(apiIndex, 'failureCount')) - 1); // Exponential backoff using failure count // Start with RETRY_DELAY and double on each failure
      await this.poolStateManager.setFieldValue(apiIndex, 'backoffDelay', nextDelay);

      if (ApiErrorType.Timeout || ApiErrorType.RateLimit) {
        await this.poolStateManager.setFieldValue(apiIndex, 'rateLimited', true);
      } else {
        await this.poolStateManager.setFieldValue(apiIndex, 'failed', true);
      }

      await this.poolStateManager.clearTimeout(apiIndex);

      await this.poolStateManager.setTimeout(apiIndex, nextDelay);

      logger.warn(
        `Endpoint ${await this.poolStateManager.getFieldValue(apiIndex, 'endpoint')} experienced an error (${
          error.errorType
        }). Suspending for ${nextDelay / 1000}s.`
      );
    }
  }

  async handleApiSuccess(apiIndex: number, responseTime: number): Promise<void> {
    const performanceScore = await this.poolStateManager.getFieldValue(apiIndex, 'performanceScore');
    const failureCount = await this.poolStateManager.getFieldValue(apiIndex, 'failureCount');

    const updatedScore = performanceScore + this.calculatePerformanceScore(responseTime, failureCount);
    await this.poolStateManager.setFieldValue(apiIndex, 'performanceScore', updatedScore);
  }

  wrapApiCall<T extends (...args: any[]) => any>(
    fn: T,
    api: any,
    handleError: (error: Error) => ApiConnectionError
  ): T {
    const wrappedFunction = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const index = this.apiToIndexMap.get(api);
      try {
        const start = Date.now();
        const result = await fn(...args);
        const end = Date.now();
        await this.handleApiSuccess(index as unknown as number, end - start);
        return result;
      } catch (error) {
        await this.handleApiError(index as unknown as number, handleError(error as Error));
        throw error;
      }
    };
    return wrappedFunction as T;
  }

  async handleConnectionStateChange(): Promise<void> {
    // Update the cached value
    await this.updateNextConnectedApiIndex();
  }
}
