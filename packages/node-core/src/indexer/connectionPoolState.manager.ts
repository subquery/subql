// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {OnApplicationShutdown} from '@nestjs/common';
import chalk from 'chalk';
import {toNumber} from 'lodash';
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
  initFailed: boolean;
  timeoutId?: NodeJS.Timeout;
}

const logger = getLogger('connection-pool-state');

export interface IConnectionPoolStateManager<T extends IApiConnectionSpecific<any, any, any>> {
  addToConnections(endpoint: string, index: number, primary: boolean): Promise<void>;
  getNextConnectedApiIndex(): Promise<number | undefined>;
  // Async to be compatible with workers
  getFieldValue<K extends keyof ConnectionPoolItem<T>>(apiIndex: number, field: K): Promise<ConnectionPoolItem<T>[K]>;
  // Async to be compatible with workers
  setFieldValue<K extends keyof ConnectionPoolItem<T>>(
    apiIndex: number,
    field: K,
    value: ConnectionPoolItem<T>[K]
  ): Promise<void>;
  getSuspendedIndices(): Promise<number[]>;
  removeFromConnections(apiIndex: number): Promise<void>;
  handleApiError(apiIndex: number, errorType: ApiErrorType): Promise<void>;
  handleApiSuccess(apiIndex: number, responseTime: number): Promise<void>;
  getDisconnectedIndices(): Promise<number[]>;
}

export class ConnectionPoolStateManager<T extends IApiConnectionSpecific<any, any, any>>
  implements OnApplicationShutdown
{
  private pool: Record<number, ConnectionPoolItem<T>> = {};

  //eslint-disable-next-line @typescript-eslint/require-await
  async addToConnections(endpoint: string, index: number, primary: boolean, initFailed: boolean): Promise<void> {
    //avoid overwriting state if init failed in one of the workers
    if (this.pool[index] && this.pool[index].initFailed) {
      return;
    }

    const poolItem: ConnectionPoolItem<T> = {
      primary: primary,
      performanceScore: 100,
      failureCount: 0,
      endpoint: endpoint,
      backoffDelay: 0,
      rateLimited: false,
      failed: initFailed,
      connected: true,
      lastRequestTime: 0,
      initFailed: initFailed,
    };
    this.pool[index] = poolItem;

    if (primary) {
      logger.info(`Primary endpoint ${endpoint} added.`);
    }
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getNextConnectedApiIndex(): Promise<number | undefined> {
    const primaryIndex = this.getPrimaryEndpointIndex();
    if (primaryIndex !== undefined) {
      return primaryIndex;
    }

    const initedIndices = Object.keys(this.pool)
      .map(Number)
      .filter((index) => !this.pool[index].initFailed);

    if (initedIndices.length === 0) {
      throw new Error(`Initialization failed for all endpoints. Please add healthier endpoints.`);
    }

    const indices = initedIndices.filter((index) => !this.pool[index].backoffDelay && this.pool[index].connected);

    if (indices.length === 0) {
      // If all endpoints are suspended, try to find a rate-limited one
      const rateLimitedIndices = Object.keys(this.pool)
        .map(Number)
        .filter((index) => this.pool[index].backoffDelay && this.pool[index].rateLimited);

      if (rateLimitedIndices.length === 0) {
        // If no rate-limited endpoints found, return undefined
        return undefined;
      }

      // If there are rate-limited endpoints, return one of them at random
      return rateLimitedIndices[Math.floor(Math.random() * rateLimitedIndices.length)];
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

  private getPrimaryEndpointIndex(): number | undefined {
    return Object.keys(this.pool)
      .map(Number)
      .find(
        (index) =>
          this.pool[index].primary &&
          !this.pool[index].backoffDelay &&
          this.pool[index].connected &&
          !this.pool[index].initFailed
      );
  }

  get numConnections(): number {
    return Object.keys(this.pool).length;
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getFieldValue<K extends keyof ConnectionPoolItem<T>>(
    apiIndex: number,
    field: K
  ): Promise<ConnectionPoolItem<T>[K]> {
    return this.pool[apiIndex]?.[field];
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async setFieldValue<K extends keyof ConnectionPoolItem<T>>(
    apiIndex: number,
    field: K,
    value: ConnectionPoolItem<T>[K]
  ): Promise<void> {
    this.pool[apiIndex][field] = value;
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getSuspendedIndices(): Promise<number[]> {
    return Object.keys(this.pool)
      .map(Number)
      .filter((index) => this.pool[index].backoffDelay !== 0);
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async setTimeout(apiIndex: number, delay: number): Promise<void> {
    // Make sure there is no existing timeout
    await this.clearTimeout(apiIndex);

    this.pool[apiIndex].timeoutId = setTimeout(() => {
      this.pool[apiIndex].backoffDelay = 0; // Reset backoff delay only if there are no consecutive errors
      this.pool[apiIndex].rateLimited = false;
      this.pool[apiIndex].failed = false;
      this.pool[apiIndex].timeoutId = undefined; // Clear the timeout ID

      const suspendedIndices = Object.keys(this.pool)
        .map(toNumber)
        .filter((index) => this.pool[index].backoffDelay !== 0);

      if (suspendedIndices.length === 0) {
        logger.info(chalk.green('No suspended endpoints.'));
      }
    }, delay);
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async clearTimeout(apiIndex: number): Promise<void> {
    if (this.pool[apiIndex].timeoutId) {
      clearTimeout(this.pool[apiIndex].timeoutId);
      this.pool[apiIndex].timeoutId = undefined;
    }
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async removeFromConnections(apiIndex: number): Promise<void> {
    delete this.pool[apiIndex];
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async onApplicationShutdown(): Promise<void> {
    Object.values(this.pool).forEach((_, index) => {
      this.clearTimeout(index);
    });
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async handleApiError(apiIndex: number, errorType: ApiErrorType): Promise<void> {
    if (this.pool[apiIndex].failed || this.pool[apiIndex].rateLimited) {
      //if this api was used again then it must be in the same batch of blocks
      return;
    }
    const adjustment = errorTypeToScoreAdjustment[errorType] || errorTypeToScoreAdjustment.default;
    this.pool[apiIndex].performanceScore += adjustment;
    this.pool[apiIndex].failureCount++;

    if (errorType === ApiErrorType.Connection) {
      if (this.pool[apiIndex].connected) {
        //handleApiDisconnects was already called if this is false
        //this.handleApiDisconnects(apiIndex);
        this.pool[apiIndex].connected = false;
      }
      return;
    }

    if (errorType !== ApiErrorType.Default) {
      const nextDelay = RETRY_DELAY * Math.pow(2, this.pool[apiIndex].failureCount - 1); // Exponential backoff using failure count // Start with RETRY_DELAY and double on each failure
      this.pool[apiIndex].backoffDelay = nextDelay;

      if (ApiErrorType.Timeout || ApiErrorType.RateLimit) {
        this.pool[apiIndex].rateLimited = true;
      } else {
        this.pool[apiIndex].failed = true;
      }

      await this.setTimeout(apiIndex, nextDelay);

      logger.warn(
        `Endpoint ${this.pool[apiIndex].endpoint} experienced an error (${errorType}). Suspending for ${
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
  async handleApiSuccess(apiIndex: number, responseTime: number): Promise<void> {
    const performanceScore = this.pool[apiIndex].performanceScore;
    const failureCount = this.pool[apiIndex].failureCount;

    const updatedScore = performanceScore + this.calculatePerformanceScore(responseTime, failureCount);
    this.pool[apiIndex].performanceScore = updatedScore;
  }

  async handleBatchApiSuccess(successResults: Array<{apiIndex: number; responseTime: number}>): Promise<void> {
    for (const result of successResults) {
      await this.handleApiSuccess(result.apiIndex, result.responseTime);
    }
  }

  async handleBatchApiError(errorResults: Array<{apiIndex: number; errorType: ApiErrorType}>): Promise<void> {
    for (const result of errorResults) {
      await this.handleApiError(result.apiIndex, result.errorType);
    }
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getDisconnectedIndices(): Promise<number[]> {
    return Object.keys(this.pool)
      .map(Number)
      .filter((index) => !this.pool[index].connected);
  }
}
