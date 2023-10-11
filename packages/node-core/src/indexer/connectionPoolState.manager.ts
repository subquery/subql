// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {OnApplicationShutdown} from '@nestjs/common';
import chalk from 'chalk';
import {ApiErrorType} from '../api.connection.error';
import {IApiConnectionSpecific} from '../api.service';
import {getLogger} from '../logger';
import {errorTypeToScoreAdjustment} from './connectionPool.service';

const RETRY_DELAY = 60 * 1000;
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

const logger = getLogger('connection-pool-state');

export interface IConnectionPoolStateManager<T extends IApiConnectionSpecific<any, any, any>> {
  addToConnections(endpoint: string, primary: boolean, initFailed: boolean): Promise<void>;
  getNextConnectedEndpoint(): Promise<string | undefined>;
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

  //eslint-disable-next-line @typescript-eslint/require-await
  async addToConnections(endpoint: string, primary: boolean): Promise<void> {
    const poolItem: ConnectionPoolItem<T> = {
      primary: primary,
      performanceScore: 100,
      failureCount: 0,
      endpoint: endpoint,
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

  //eslint-disable-next-line @typescript-eslint/require-await
  async getNextConnectedEndpoint(): Promise<string | undefined> {
    const primaryendpoint = this.getPrimaryEndpoint();
    if (primaryendpoint !== undefined) {
      return primaryendpoint;
    }

    const endpoints = Object.keys(this.pool).filter(
      (endpoint) => !this.pool[endpoint].backoffDelay && this.pool[endpoint].connected && !this.pool[endpoint].failed
    );

    if (endpoints.length === 0) {
      // If all endpoints are suspended, try to find a rate-limited one
      const rateLimitedEndpoints = Object.keys(this.pool).filter(
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
  async setTimeout(endpoint: string, delay: number): Promise<void> {
    // Make sure there is no existing timeout
    await this.clearTimeout(endpoint);

    this.pool[endpoint].timeoutId = setTimeout(() => {
      this.pool[endpoint].backoffDelay = 0; // Reset backoff delay only if there are no consecutive errors
      this.pool[endpoint].rateLimited = false;
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
      process.exit(1);
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

    if (errorType === ApiErrorType.Connection) {
      if (this.pool[endpoint].connected) {
        //handleApiDisconnects was already called if this is false
        //this.handleApiDisconnects(endpoint);
        this.pool[endpoint].connected = false;
      }
      return;
    }

    if (errorType !== ApiErrorType.Default) {
      const nextDelay = RETRY_DELAY * Math.pow(2, this.pool[endpoint].failureCount - 1); // Exponential backoff using failure count // Start with RETRY_DELAY and double on each failure
      this.pool[endpoint].backoffDelay = nextDelay;

      if (ApiErrorType.Timeout || ApiErrorType.RateLimit) {
        this.pool[endpoint].rateLimited = true;
      } else {
        this.pool[endpoint].failed = true;
      }

      await this.setTimeout(endpoint, nextDelay);

      logger.warn(
        `Endpoint ${this.pool[endpoint].endpoint} experienced an error (${errorType}). Suspending for ${
          nextDelay / 1000
        }s.`
      );
    }
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
