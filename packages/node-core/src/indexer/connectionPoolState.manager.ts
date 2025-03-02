// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {OnApplicationShutdown} from '@nestjs/common';
import {Interval} from '@nestjs/schedule';
import chalk from 'chalk';
import {ApiErrorType} from '../api.connection.error';
import {IApiConnectionSpecific} from '../api.service';
import {getLogger} from '../logger';
import {exitWithError} from '../process';
import {errorTypeToScoreAdjustment} from './connectionPool.service';

const RETRY_DELAY = 10 * 1000;
const MAX_RETRY_DELAY = 32 * RETRY_DELAY;
const MAX_FAILURES = 5;
const RESPONSE_TIME_WEIGHT = 0.7;
const FAILURE_WEIGHT = 0.3;

export interface ConnectionPoolItem<T> {
  endpoint: string;
  primary: boolean;
  performanceScore: number;
  backoffDelay: number;
  failureCount: number;
  rateLimited: boolean;
  failed: boolean;
  lastRequestTime: number;
  connected: boolean;
  timeoutId?: NodeJS.Timeout;
}

const logger = getLogger('ConnectionPoolState');

export interface IConnectionPoolStateManager<T extends IApiConnectionSpecific<any, any, any>> {
  addToConnections(endpoint: string, primary: boolean, initFailed: boolean): Promise<void>;
  // Connected endpoints allows reducing the endpoints to ones connected in the worker
  getNextConnectedEndpoint(connectedEndpoints?: string[]): Promise<string | undefined>;
  // Async to be compatible with workers
  getFieldValue<K extends keyof ConnectionPoolItem<T>>(endpoint: string, field: K): Promise<ConnectionPoolItem<T>[K]>;
  // Async to be compatible with workers
  setFieldValue<K extends keyof ConnectionPoolItem<T>>(
    endpoint: string,
    field: K,
    value: ConnectionPoolItem<T>[K]
  ): Promise<void>;
  getSuspendedEndpoints(): Promise<string[]>;
  removeFromConnections(endpoint: string): Promise<void>;
  handleApiError(endpoint: string, errorType: ApiErrorType): Promise<void>;
  handleApiSuccess(endpoint: string, responseTime: number): Promise<void>;
  getDisconnectedEndpoints(): Promise<string[]>;
}

export class ConnectionPoolStateManager<T extends IApiConnectionSpecific<any, any, any>>
  implements OnApplicationShutdown
{
  private pool: Record<string, ConnectionPoolItem<T>> = {};

  /**
   * @param onAllConnectionsRemoved - allows overwritting the behaviour when all connections are removed
   * */
  constructor(
    private onAllConnectionsRemoved: () => void = () => {
      exitWithError(`All api connection removed`);
    }
  ) {}

  //eslint-disable-next-line @typescript-eslint/require-await
  async addToConnections(endpoint: string, primary: boolean): Promise<void> {
    const poolItem: ConnectionPoolItem<T> = {
      primary,
      performanceScore: 100,
      failureCount: 0,
      endpoint,
      backoffDelay: 0,
      rateLimited: false,
      failed: false,
      connected: true,
      lastRequestTime: 0,
    };
    this.pool[endpoint] = poolItem;

    if (primary) {
      logger.info(`Primary endpoint ${endpoint} added.`);
    }
  }

  @Interval(15000)
  logConnectionStatus(): void {
    logger.debug(
      JSON.stringify(
        this.pool,
        (key, value) => {
          // Cannot stringify NodeJs timeouts
          if (key === 'timeoutId') {
            return undefined;
          }
          return value;
        },
        2
      )
    );
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getNextConnectedEndpoint(connectedEndpoints?: string[]): Promise<string | undefined> {
    const primaryendpoint = this.getPrimaryEndpoint();
    if (primaryendpoint !== undefined) {
      return primaryendpoint;
    }

    const availableEndpoints = Object.keys(this.pool).filter(
      (endpoint) => !connectedEndpoints || connectedEndpoints.includes(endpoint)
    );

    const endpoints = availableEndpoints.filter(
      (endpoint) => !this.pool[endpoint].backoffDelay && this.pool[endpoint].connected && !this.pool[endpoint].failed
    );

    if (endpoints.length === 0) {
      // If all endpoints are suspended, try to find a rate-limited one
      const rateLimitedEndpoints = availableEndpoints.filter(
        (endpoint) => this.pool[endpoint].backoffDelay && this.pool[endpoint].rateLimited
      );

      if (rateLimitedEndpoints.length === 0) {
        // If no rate-limited endpoints found, return undefined
        // FIXME: We better block the promise until one endpoint is recovered from suspension
        return undefined;
      }

      // If there are rate-limited endpoints, return one of them at random
      return rateLimitedEndpoints[Math.floor(Math.random() * rateLimitedEndpoints.length)];
    }

    // Sort indices based on their performance scores in descending order
    endpoints.sort((a, b) => this.pool[b].performanceScore - this.pool[a].performanceScore);

    // Calculate the sum of performance scores
    const sumScores = endpoints.reduce((acc, idx) => acc + this.pool[idx].performanceScore, 0);

    // Calculate the cumulative probability distribution
    const cumulativeProbs: number[] = [];
    endpoints.forEach((idx, i) => {
      const prevProb = i > 0 ? cumulativeProbs[i - 1] : 0;
      cumulativeProbs[i] = prevProb + this.pool[idx].performanceScore / sumScores;
    });

    // Choose a random number between 0 and 1
    const rand = Math.random();

    // Find the first endpoint in the cumulative probability distribution that is greater than the random number
    const selectedIndex = cumulativeProbs.findIndex((prob) => prob >= rand);

    // Return the corresponding endpoint from the sorted indices
    return endpoints[selectedIndex];
  }

  private getPrimaryEndpoint(): string | undefined {
    return Object.keys(this.pool).find(
      (endpoint) =>
        this.pool[endpoint].primary &&
        !this.pool[endpoint].backoffDelay &&
        this.pool[endpoint].connected &&
        !this.pool[endpoint].failed
    );
  }

  get numConnections(): number {
    return Object.keys(this.pool).length;
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getFieldValue<K extends keyof ConnectionPoolItem<T>>(
    endpoint: string,
    field: K
  ): Promise<ConnectionPoolItem<T>[K]> {
    return this.pool[endpoint]?.[field];
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async setFieldValue<K extends keyof ConnectionPoolItem<T>>(
    endpoint: string,
    field: K,
    value: ConnectionPoolItem<T>[K]
  ): Promise<void> {
    this.pool[endpoint][field] = value;
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getSuspendedEndpoints(): Promise<string[]> {
    return Object.keys(this.pool).filter((endpoint) => this.pool[endpoint].backoffDelay !== 0);
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async setRecoverTimeout(endpoint: string, delay: number): Promise<void> {
    // Make sure there is no existing timeout
    await this.clearTimeout(endpoint);

    this.pool[endpoint].timeoutId = setTimeout(() => {
      this.pool[endpoint].backoffDelay = 0; // Reset backoff delay only if there are no consecutive errors
      // this.pool[endpoint].rateLimited = false;   // Do not reset rateLimited status
      this.pool[endpoint].failed = false;
      this.pool[endpoint].timeoutId = undefined; // Clear the timeout ID

      const suspendedEndpoints = Object.keys(this.pool).filter((endpoint) => this.pool[endpoint].backoffDelay !== 0);

      if (suspendedEndpoints.length === 0) {
        logger.info(chalk.green('No suspended endpoints.'));
      }
    }, delay);
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async clearTimeout(endpoint: string): Promise<void> {
    if (this.pool[endpoint].timeoutId) {
      clearTimeout(this.pool[endpoint].timeoutId);
      this.pool[endpoint].timeoutId = undefined;
    }
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async removeFromConnections(endpoint: string): Promise<void> {
    delete this.pool[endpoint];
    if (Object.keys(this.pool).length === 0) {
      // Cannot throw here because it would be off stack
      logger.error('No more connections available. Please add healthier endpoints');
      this.onAllConnectionsRemoved();
    }
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async onApplicationShutdown(): Promise<void> {
    Object.keys(this.pool).forEach((endpoint) => {
      this.clearTimeout(endpoint);
    });
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async handleApiError(endpoint: string, errorType: ApiErrorType): Promise<void> {
    if (Object.keys(this.pool).length === 1 || this.pool[endpoint].failed || this.pool[endpoint].rateLimited) {
      //if this api was used again then it must be in the same batch of blocks
      return;
    }
    const adjustment = errorTypeToScoreAdjustment[errorType] || errorTypeToScoreAdjustment.default;
    this.pool[endpoint].performanceScore += adjustment;
    this.pool[endpoint].failureCount++;

    switch (errorType) {
      case ApiErrorType.Connection: {
        if (this.pool[endpoint].connected) {
          // The connected status does not provide service. handleApiDisconnects() will be called to handle this.
          this.pool[endpoint].connected = false;
        }
        return;
      }
      case ApiErrorType.Timeout:
      case ApiErrorType.RateLimit: {
        // The “rateLimited” status will be selected when no endpoints are available, so we should avoid setting a large delay.
        this.pool[endpoint].rateLimited = true;
        break;
      }
      case ApiErrorType.Default: {
        // The “failed” status does not provide service.
        this.pool[endpoint].failed = true;
        break;
      }
      default: {
        throw new Error(`Unknown error type ${errorType}`);
      }
    }

    const nextDelay = this.calculateNextDelay(this.pool[endpoint]);
    this.pool[endpoint].backoffDelay = nextDelay;
    await this.setRecoverTimeout(endpoint, nextDelay);

    logger.warn(
      `Endpoint ${this.pool[endpoint].endpoint} experienced an error (${errorType}). Suspending for ${
        nextDelay / 1000
      }s.`
    );
  }

  private calculateNextDelay(poolItem: ConnectionPoolItem<T>): number {
    // Exponential backoff using failure count, Start with RETRY_DELAY and double on each failure, MAX_RETRY_DELAY is the maximum delay
    return Math.min(RETRY_DELAY * Math.pow(2, poolItem.failureCount - 1), MAX_RETRY_DELAY);
  }

  private calculatePerformanceScore(responseTime: number, failureCount: number): number {
    const responseTimeScore = 1 / (1 + Math.log(1 + responseTime));
    const failureScore = 1 - failureCount / MAX_FAILURES;
    return RESPONSE_TIME_WEIGHT * responseTimeScore + FAILURE_WEIGHT * failureScore;
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async handleApiSuccess(endpoint: string, responseTime: number): Promise<void> {
    const performanceScore = this.pool[endpoint].performanceScore;
    const failureCount = this.pool[endpoint].failureCount;

    const updatedScore = performanceScore + this.calculatePerformanceScore(responseTime, failureCount);
    this.pool[endpoint].performanceScore = updatedScore;
  }

  async handleBatchApiSuccess(successResults: Array<{endpoint: string; responseTime: number}>): Promise<void> {
    for (const result of successResults) {
      await this.handleApiSuccess(result.endpoint, result.responseTime);
    }
  }

  async handleBatchApiError(errorResults: Array<{endpoint: string; errorType: ApiErrorType}>): Promise<void> {
    for (const result of errorResults) {
      await this.handleApiError(result.endpoint, result.errorType);
    }
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getDisconnectedEndpoints(): Promise<string[]> {
    return Object.keys(this.pool).filter((endpoint) => !this.pool[endpoint].connected);
  }
}
