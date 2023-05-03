// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {NetworkMetadataPayload} from './events';
import {ApiConnection, ApiConnectionError, ConnectionPoolService, ISubqueryProject} from './indexer';
import {getLogger} from './logger';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

type FetchFunction<T, A> = (batch: number[], api: A) => Promise<T[]>;
type FetchFunctionProvider<T, A> = () => FetchFunction<T, A>;

export abstract class ApiService<P extends ISubqueryProject = ISubqueryProject, A = any, B = any> {
  constructor(protected project: P, protected connectionPoolService: ConnectionPoolService<ApiConnection>) {}

  abstract init(): Promise<ApiService<P, A>>;
  abstract get api(): A; /*ApiWrapper*/
  abstract fetchBlocks(heights: number[]): Promise<B[]>;
  abstract networkMeta: NetworkMetadataPayload;

  async fetchBlocksGeneric<B>(
    fetchFuncProvider: FetchFunctionProvider<B, A>,
    batch: number[],
    api: A,
    handleError: (error: Error) => ApiConnectionError,
    numAttempts = MAX_RECONNECT_ATTEMPTS
  ): Promise<B[]> {
    {
      let reconnectAttempts = 0;
      while (reconnectAttempts < numAttempts) {
        try {
          // Get the latest fetch function from the provider
          const fetchFunc = fetchFuncProvider();
          const wrappedFetchFunc = this.connectionPoolService.wrapApiCall(fetchFunc, api, handleError);
          return await wrappedFetchFunc(batch, api);
        } catch (e: any) {
          logger.error(e, `Failed to fetch blocks ${batch[0]}...${batch[batch.length - 1]}`);

          reconnectAttempts++;
        }
      }
      throw new Error(`Maximum number of retries (${numAttempts}) reached.`);
    }
  }
}
