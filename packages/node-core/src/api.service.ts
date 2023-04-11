// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable} from '@nestjs/common';
// import {ApiWrapper} from '@subql/types-avalanche';
import {NetworkMetadataPayload} from './events';
import {getLogger} from './logger';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

type FetchFunction<T> = (batch: number[], overallSpecVer?: number) => Promise<T[]>;
type FetchFunctionProvider<T> = () => FetchFunction<T>;

@Injectable()
export abstract class ApiService {
  networkMeta: NetworkMetadataPayload;

  constructor(protected project: any) {}

  abstract init(): Promise<ApiService>;

  async fetchBlocksGeneric<T>(
    batch: number[],
    fetchFuncProvider: FetchFunctionProvider<T>,
    overallSpecVer?: number
  ): Promise<T[]> {
    let reconnectAttempts = 0;
    while (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      try {
        // Get the latest fetch function from the provider
        const fetchFunc = fetchFuncProvider();
        const blocks = await fetchFunc(batch, overallSpecVer);
        return blocks;
      } catch (e) {
        logger.error(e, `Failed to fetch blocks ${batch[0]}...${batch[batch.length - 1]}`);

        reconnectAttempts++;
      }
    }
    throw new Error(`Maximum number of retries (${MAX_RECONNECT_ATTEMPTS}) reached.`);
  }
  abstract get api(): any; /*ApiWrapper*/
}
