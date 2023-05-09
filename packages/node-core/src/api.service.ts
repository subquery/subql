// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {NetworkMetadataPayload} from './events';
import {ApiConnectionError, ApiErrorType, ConnectionPoolService, ISubqueryProject} from './indexer';
import {getLogger} from './logger';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

type FetchFunction<T, A> = (batch: number[], api: A) => Promise<T[]>;
type FetchFunctionProvider<T, A> = () => [FetchFunction<T, A>, A];

export interface IApi<A = any, SA = any, B = any> {
  fetchBlocks(heights: number[], ...args: any): Promise<B[]>;
  safeApi(height: number): SA;
  unsafeApi: A;
  handleError?(error: Error): ApiConnectionError;
  apiConnect?(): Promise<void>;
  apiDisconnect?(): Promise<void>;
}

export abstract class Api<A, SA, B> implements IApi<A, SA, B> {
  constructor(protected _unsafeApiInstance: A) {}

  //eslint-disable-next-line @typescript-eslint/require-await
  async fetchBlocks(heights: number[], ...args: any): Promise<B[]> {
    throw new Error(`Not Implemented`);
  }

  safeApi(height: number): SA {
    throw new Error(`Not Implemented`);
  }

  get unsafeApi(): A {
    return this._unsafeApiInstance;
  }

  handleError(error: Error): ApiConnectionError {
    return new ApiConnectionError(error.name, error.message, ApiErrorType.Default);
  }
}

export abstract class ApiService<A = any, SA = any, B = any> implements IApi<A, SA, B> {
  constructor(protected connectionPoolService: ConnectionPoolService<Api<A, SA, B>>) {}
  abstract networkMeta: NetworkMetadataPayload;

  async fetchBlocks(heights: number[], numAttempts = MAX_RECONNECT_ATTEMPTS): Promise<B[]> {
    let reconnectAttempts = 0;
    while (reconnectAttempts < numAttempts) {
      try {
        // Get the latest fetch function from the provider
        const apiInstance = this.connectionPoolService.api;
        return await apiInstance.fetchBlocks(heights);
      } catch (e: any) {
        logger.error(e, `Failed to fetch blocks ${heights[0]}...${heights[heights.length - 1]}`);

        reconnectAttempts++;
      }
    }
    throw new Error(`Maximum number of retries (${numAttempts}) reached.`);
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

  handleError(error: Error): ApiConnectionError {
    return new ApiConnectionError(error.name, error.message, ApiErrorType.Default);
  }
}
