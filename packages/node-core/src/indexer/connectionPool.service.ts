// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {OnApplicationShutdown, Injectable} from '@nestjs/common';
import chalk from 'chalk';
import {toNumber} from 'lodash';
import {getLogger} from '../logger';

const logger = getLogger('connection-pool');

const MAX_FAILURES = 5;
const LOG_INTERVAL_MS = 60 * 1000; // Log every 60 seconds
const RESPONSE_TIME_WEIGHT = 0.7;
const FAILURE_WEIGHT = 0.3;
const RETRY_DELAY = 60 * 1000;

export interface ApiConnection {
  apiConnect(): Promise<void>;
  apiDisconnect(): Promise<void>;
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

@Injectable()
export class ConnectionPoolService<T extends ApiConnection> implements OnApplicationShutdown {
  private allApi: T[] = [];
  private apiToIndexMap: Map<any, number> = new Map();
  private indexToEndpointMap: Record<number, string> = {};
  private connectionPool: Record<number, T> = {};
  private performanceScores: Record<number, number> = {};
  private backoffDelays: Record<number, number> = {};
  private failureCounts: Record<number, number> = {};

  private errorTypeToScoreAdjustment = {
    [ApiErrorType.Timeout]: -10,
    [ApiErrorType.Connection]: -20,
    [ApiErrorType.Default]: -5,
  };

  constructor() {
    this.startLoggingEndpointStatus(LOG_INTERVAL_MS);
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      Object.keys(this.connectionPool).map((key) => this.connectionPool[toNumber(key)].apiDisconnect())
    );
  }

  addToConnections(api: T, endpoint: string): void {
    const index = this.allApi.length;
    this.allApi.push(api);
    this.connectionPool[index] = api;
    this.performanceScores[index] = 100; //set to non-zero value
    this.failureCounts[index] = 0;
    this.apiToIndexMap.set(api.api, index);
    this.indexToEndpointMap[index] = endpoint;
  }

  addBatchToConnections(apis: T[], endpoints: string[]): void {
    apis.forEach((api, i) => this.addToConnections(api, endpoints[i]));
  }

  async connectToApi(apiIndex: number): Promise<void> {
    await this.allApi[apiIndex].apiConnect();
  }

  get api(): T {
    const index = this.getNextConnectedApiIndex();
    if (index === -1) {
      throw new Error('No connected api');
    }
    return this.connectionPool[index];
  }

  getNextConnectedApiIndex(): number {
    const indices = Object.keys(this.connectionPool)
      .map(toNumber)
      .filter((index) => !this.backoffDelays[index]);

    if (indices.length === 0) {
      return -1;
    }

    // Sort indices based on their performance scores in descending order
    indices.sort((a, b) => this.performanceScores[b] - this.performanceScores[a]);

    // Calculate the sum of performance scores
    const sumScores = indices.reduce((acc, idx) => acc + this.performanceScores[idx], 0);

    // Calculate the cumulative probability distribution
    const cumulativeProbs: number[] = [];
    indices.forEach((idx, i) => {
      const prevProb = i > 0 ? cumulativeProbs[i - 1] : 0;
      cumulativeProbs[i] = prevProb + this.performanceScores[idx] / sumScores;
    });

    // Choose a random number between 0 and 1
    const rand = Math.random();

    // Find the first index in the cumulative probability distribution that is greater than the random number
    const selectedIndex = cumulativeProbs.findIndex((prob) => prob >= rand);

    // Return the corresponding index from the sorted indices
    return indices[selectedIndex];
  }

  get numConnections(): number {
    return Object.keys(this.connectionPool).length;
  }

  async handleApiDisconnects(apiIndex: number, endpoint: string): Promise<void> {
    logger.warn(`disconnected from ${endpoint}`);
    delete this.connectionPool[apiIndex];

    try {
      logger.debug(`reconnecting to ${endpoint}...`);
      await this.connectToApi(apiIndex);
    } catch (e) {
      logger.error(`unable to reconnect to endpoint ${endpoint}`, e);
      return;
    }

    logger.info(`reconnected to ${endpoint}!`);
    this.connectionPool[apiIndex] = this.allApi[apiIndex];
  }

  private calculatePerformanceScore(responseTime: number, failureCount: number): number {
    const responseTimeScore = 1 / responseTime;
    const failureScore = 1 - failureCount / MAX_FAILURES;
    return RESPONSE_TIME_WEIGHT * responseTimeScore + FAILURE_WEIGHT * failureScore;
  }

  logEndpointStatus(): void {
    const suspendedIndices = Object.keys(this.connectionPool)
      .map(toNumber)
      .filter((index) => this.backoffDelays[index]);

    if (suspendedIndices.length === 0) {
      logger.info(chalk.green('No suspended endpoints.'));
      return;
    }

    let suspendedEndpointsInfo = chalk.yellow('Suspended endpoints:\n');

    suspendedIndices.forEach((index) => {
      const endpoint = chalk.cyan(this.indexToEndpointMap[index]);
      const failures = chalk.red(`Failures: ${this.failureCounts[index]}`);
      const backoff = chalk.yellow(`Backoff (ms): ${this.backoffDelays[index]}`);

      suspendedEndpointsInfo += `\n- ${endpoint}\n  ${failures}\n  ${backoff}\n`;
    });

    logger.info(suspendedEndpointsInfo);
  }

  handleApiError(apiIndex: number, error: ApiConnectionError): void {
    const adjustment = this.errorTypeToScoreAdjustment[error.errorType] || this.errorTypeToScoreAdjustment.default;
    this.performanceScores[apiIndex] += adjustment;
    this.failureCounts[apiIndex]++;

    if (error.errorType === ApiErrorType.Timeout || error.errorType === ApiErrorType.Connection) {
      const nextDelay = RETRY_DELAY * Math.pow(2, this.failureCounts[apiIndex] - 1); // Exponential backoff using failure count // Start with RETRY_DELAY and double on each failure
      this.backoffDelays[apiIndex] = nextDelay;

      setTimeout(() => {
        delete this.backoffDelays[apiIndex]; // Reset backoff delay only if there are no consecutive errors
      }, nextDelay);

      logger.warn(
        `Endpoint ${this.indexToEndpointMap[apiIndex]} experienced an error (${error.errorType}). Suspending for ${
          nextDelay / 1000
        }s.`
      );
    }
  }

  handleApiSuccess(apiIndex: number, responseTime: number): void {
    this.performanceScores[apiIndex] += this.calculatePerformanceScore(responseTime, this.failureCounts[apiIndex]);
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

  startLoggingEndpointStatus(intervalMs: number): void {
    setInterval(() => {
      this.logEndpointStatus();
    }, intervalMs);
  }
}
