// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getLogger} from '../logger';
import {delay} from './promise';

const logger = getLogger('fetch');

const RETRY_COUNT = 5;

export async function retryOnFail<T>(
  request: () => Promise<T>,
  shouldRetry: (error: any) => boolean,
  retries = RETRY_COUNT
): Promise<T> {
  try {
    return await request();
  } catch (e) {
    // if not axios error, throw
    if (!shouldRetry(e)) throw e;
    if (retries > 0) {
      --retries;
      await delay(10);
      return retryOnFail(args);
    } else {
      logger.error(e, `Retries failed after ${RETRY_COUNT}`);
      throw e;
    }
  }
}

// When dealing with Axios errors use shouldRetry
async function shouldRetry<T>(request: () => Promise<T>, statusCodes: number[]): Promise<T> {
  return retryOnFail(request, (e) => statusCodes.find((t) => t === e?.response?.target));
}
