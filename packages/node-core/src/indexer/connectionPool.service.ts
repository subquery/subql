// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {OnApplicationShutdown, Injectable} from '@nestjs/common';
import {Interval} from '@nestjs/schedule';
import chalk from 'chalk';
import {toNumber} from 'lodash';
import {IApi} from '..';
import {getLogger} from '../logger';

const logger = getLogger('connection-pool');

const MAX_FAILURES = 5;
const LOG_INTERVAL_MS = 60 * 1000; // Log every 60 seconds
const RESPONSE_TIME_WEIGHT = 0.7;
const FAILURE_WEIGHT = 0.3;
const RETRY_DELAY = 60 * 1000;

export interface ApiConnection {
  //apiConnect(): Promise<void>;
  //apiDisconnect(): Promise<void>;
  api: any;
}

export enum ApiErrorType {
  Timeout = 'timeout',
  Connection = 'connection',
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

interface ConnectionPoolItem<T> {
  endpoint: string;
  connection: T;
  performanceScore: number;
  backoffDelay: number;
  failureCount: number;
}

@Injectable()
export class ConnectionPoolService<T extends IApi<any, any, any>> implements OnApplicationShutdown {
  private allApi: T[] = [];
  private apiToIndexMap: Map<any, number> = new Map();
  private pool: Record<number, ConnectionPoolItem<T>> = {};

  private errorTypeToScoreAdjustment = {
    [ApiErrorType.Timeout]: -10,
    [ApiErrorType.Connection]: -20,
    [ApiErrorType.Default]: -5,
  };

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(Object.values(this.pool).map((poolItem) => poolItem.connection.apiDisconnect!()));
  }

  addToConnections(api: T, endpoint: string): void {
    const index = this.allApi.length;
    this.allApi.push(api);

    const poolItem: ConnectionPoolItem<T> = {
      connection: api,
      performanceScore: 100,
      failureCount: 0,
      endpoint: endpoint,
      backoffDelay: 0,
    };
    this.pool[index] = poolItem;
    this.apiToIndexMap.set(api, index);
  }

  addBatchToConnections(endpointToApiIndex: Record<string, T>): void {
    for (const endpoint in endpointToApiIndex) {
      this.addToConnections(endpointToApiIndex[endpoint], endpoint);
    }
  }

  async connectToApi(apiIndex: number): Promise<void> {
    await this.allApi[apiIndex].apiConnect!();
    this.pool[apiIndex].connection = this.allApi[apiIndex];
  }

  get api(): T {
    const index = this.getNextConnectedApiIndex();
    if (index === -1) {
      throw new Error('No connected api');
    }
    const api = this.pool[index].connection;

    // Create a proxy object that delegates calls to the original api object
    const wrappedApi = new Proxy(api, {
      get: (target, prop, receiver) => {
        if (prop === 'fetchBlocks') {
          return async (heights: number[], ...args: any): Promise<any> => {
            try {
              const start = Date.now();
              const result = await target.fetchBlocks(heights, ...args);
              const end = Date.now();
              this.handleApiSuccess(index, end - start);
              return result;
            } catch (error) {
              this.handleApiError(index, target.handleError!(error as Error));
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

  getNextConnectedApiIndex(): number {
    const indices = Object.keys(this.pool)
      .map(Number)
      .filter((index) => !this.pool[index].backoffDelay);

    if (indices.length === 0) {
      return -1;
    }

    // Sort indices based on their performance scores in descending order
    indices.sort((a, b) => this.pool[b].performanceScore - this.pool[a].performanceScore);

    // Calculate the sum of performance scores
    const sumScores = indices.reduce((acc, idx) => acc + this.pool[idx].performanceScore, 0);

    // Calculate the cumulative probability distribution
    const cumulativeProbs: number[] = [];
    indices.forEach((idx, i) => {
      const prevProb = i > 0 ? cumulativeProbs[i - 1] : 0;
      cumulativeProbs[i] = prevProb + this.pool[idx].performanceScore / sumScores;
    });

    // Choose a random number between 0 and 1
    const rand = Math.random();

    // Find the first index in the cumulative probability distribution that is greater than the random number
    const selectedIndex = cumulativeProbs.findIndex((prob) => prob >= rand);

    // Return the corresponding index from the sorted indices
    return indices[selectedIndex];
  }

  get numConnections(): number {
    return Object.keys(this.pool).length;
  }

  async handleApiDisconnects(apiIndex: number, endpoint: string): Promise<void> {
    logger.warn(`disconnected from ${endpoint}`);
    delete this.pool[apiIndex];

    try {
      logger.debug(`reconnecting to ${endpoint}...`);
      await this.connectToApi(apiIndex);
    } catch (e) {
      logger.error(`unable to reconnect to endpoint ${endpoint}`, e);
      return;
    }

    logger.info(`reconnected to ${endpoint}!`);
  }

  private calculatePerformanceScore(responseTime: number, failureCount: number): number {
    const responseTimeScore = 1 / responseTime;
    const failureScore = 1 - failureCount / MAX_FAILURES;
    return RESPONSE_TIME_WEIGHT * responseTimeScore + FAILURE_WEIGHT * failureScore;
  }

  @Interval(LOG_INTERVAL_MS)
  logEndpointStatus(): void {
    const suspendedIndices = Object.keys(this.pool)
      .map(toNumber)
      .filter((index) => this.pool[index].backoffDelay !== 0);

    if (suspendedIndices.length === 0) {
      logger.info(chalk.green('No suspended endpoints.'));
      return;
    }

    let suspendedEndpointsInfo = chalk.yellow('Suspended endpoints:\n');

    suspendedIndices.forEach((index) => {
      const endpoint = chalk.cyan(new URL(this.pool[index].endpoint).hostname);
      const failures = chalk.red(`Failures: ${this.pool[index].failureCount}`);
      const backoff = chalk.yellow(`Backoff (ms): ${this.pool[index].backoffDelay}`);

      suspendedEndpointsInfo += `\n- ${endpoint}\n  ${failures}\n  ${backoff}\n`;
    });

    logger.info(suspendedEndpointsInfo);
  }

  handleApiError(apiIndex: number, error: ApiConnectionError): void {
    const adjustment = this.errorTypeToScoreAdjustment[error.errorType] || this.errorTypeToScoreAdjustment.default;
    this.pool[apiIndex].performanceScore += adjustment;
    this.pool[apiIndex].failureCount++;

    if (error.errorType === ApiErrorType.Timeout || error.errorType === ApiErrorType.Connection) {
      const nextDelay = RETRY_DELAY * Math.pow(2, this.pool[apiIndex].failureCount - 1); // Exponential backoff using failure count // Start with RETRY_DELAY and double on each failure
      this.pool[apiIndex].backoffDelay = nextDelay;

      setTimeout(() => {
        this.pool[apiIndex].backoffDelay = 0; // Reset backoff delay only if there are no consecutive errors
      }, nextDelay);

      logger.warn(
        `Endpoint ${this.pool[apiIndex].endpoint} experienced an error (${error.errorType}). Suspending for ${
          nextDelay / 1000
        }s.`
      );
    }
  }

  handleApiSuccess(apiIndex: number, responseTime: number): void {
    this.pool[apiIndex].performanceScore += this.calculatePerformanceScore(
      responseTime,
      this.pool[apiIndex].failureCount
    );
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
        this.handleApiSuccess(index!, end - start);
        return result;
      } catch (error) {
        this.handleApiError(index!, handleError(error as Error));
        throw error;
      }
    };
    return wrappedFunction as T;
  }
}
