// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import chalk from 'chalk';
import {toNumber} from 'lodash';
import {IApiConnectionSpecific} from '..';

export interface ConnectionPoolItem<T> {
  endpoint: string;
  performanceScore: number;
  backoffDelay: number;
  failureCount: number;
  rateLimited: boolean;
  failed: boolean;
  lastRequestTime: number;
  connected: boolean;
  timeoutId?: NodeJS.Timeout;
}

export class ConnectionPoolStateManager<T extends IApiConnectionSpecific<any, any, any>> {
  private pool: Record<number, ConnectionPoolItem<T>> = {};

  //eslint-disable-next-line @typescript-eslint/require-await
  async addToConnections(endpoint: string, index: number): Promise<void> {
    const poolItem: ConnectionPoolItem<T> = {
      performanceScore: 100,
      failureCount: 0,
      endpoint: endpoint,
      backoffDelay: 0,
      rateLimited: false,
      failed: false,
      connected: true,
      lastRequestTime: 0,
    };
    this.pool[index] = poolItem;
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getNextConnectedApiIndex(): Promise<number | undefined> {
    const indices = Object.keys(this.pool)
      .map(Number)
      .filter((index) => !this.pool[index].backoffDelay);

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
      const randomRateLimitedIndex = rateLimitedIndices[Math.floor(Math.random() * rateLimitedIndices.length)];
      return randomRateLimitedIndex;
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
  async deleteFromPool(apiIndex: number): Promise<void> {
    delete this.pool[apiIndex];
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async shutdown(): Promise<void> {
    Object.values(this.pool).forEach((poolItem) => {
      if (poolItem.timeoutId) {
        clearTimeout(poolItem.timeoutId);
      }
    });
  }
}
