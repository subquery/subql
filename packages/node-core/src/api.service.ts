// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable} from '@nestjs/common';
// import {ApiWrapper} from '@subql/types-avalanche';
import {NetworkMetadataPayload} from './events';
import {getLogger} from './logger';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

type FetchFunction<T> = (batch: number[]) => Promise<T[]>;
type FetchFunctionProvider<T> = () => FetchFunction<T>;

@Injectable()
export abstract class ApiService {
  networkMeta: NetworkMetadataPayload;

  constructor(protected project: any) {}

  abstract init(): Promise<ApiService>;
  abstract get api(): any; /*ApiWrapper*/

  async fetchBlocksGeneric<T>(
    fetchFuncProvider: FetchFunctionProvider<T>,
    batch: number[],
    numAttempts = MAX_RECONNECT_ATTEMPTS
  ): Promise<T[]> {
    {
      let reconnectAttempts = 0;
      while (reconnectAttempts < numAttempts) {
        try {
          // Get the latest fetch function from the provider
          const fetchFunc = fetchFuncProvider();
          return await fetchFunc(batch);
        } catch (e) {
          logger.error(e, `Failed to fetch blocks ${batch[0]}...${batch[batch.length - 1]}`);

          reconnectAttempts++;
        }
      }
      throw new Error(`Maximum number of retries (${numAttempts}) reached.`);
    }
  }
}
