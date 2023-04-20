// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable} from '@nestjs/common';
import {ISubqueryProject} from './indexer';
import {getLogger} from './logger';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

type FetchFunction<T> = (batch: number[]) => Promise<T[]>;
type FetchFunctionProvider<T> = () => FetchFunction<T>;

@Injectable()
export abstract class ApiService<P extends ISubqueryProject = ISubqueryProject, A = any, B = any> {
  constructor(protected project: P) {}

  abstract init(): Promise<ApiService<P, A>>;
  abstract get api(): A; /*ApiWrapper*/
  abstract fetchBlocks(heights: number[]): Promise<B[]>;

  async fetchBlocksGeneric<B>(
    fetchFuncProvider: FetchFunctionProvider<B>,
    batch: number[],
    numAttempts = MAX_RECONNECT_ATTEMPTS
  ): Promise<B[]> {
    {
      let reconnectAttempts = 0;
      while (reconnectAttempts < numAttempts) {
        try {
          // Get the latest fetch function from the provider
          const fetchFunc = fetchFuncProvider();
          return await fetchFunc(batch);
        } catch (e: any) {
          logger.error(e, `Failed to fetch blocks ${batch[0]}...${batch[batch.length - 1]}`);

          reconnectAttempts++;
        }
      }
      throw new Error(`Maximum number of retries (${numAttempts}) reached.`);
    }
  }
}
