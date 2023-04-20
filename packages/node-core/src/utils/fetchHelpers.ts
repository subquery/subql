// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getLogger} from '../logger';
import {delay} from './promise';

const logger = getLogger('fetch');

const RETRY_COUNT = 5;
const RETRY_DELAY = 2;

export async function retryOnFail<T>(
  request: () => Promise<T>,
  shouldRetry: (error: any) => boolean,
  retries = RETRY_COUNT
): Promise<T> {
  try {
    return await request();
  } catch (e) {
    if (!shouldRetry(e)) throw e;
    if (retries > 1) {
      await delay(RETRY_DELAY);
      return retryOnFail(request, shouldRetry, --retries);
    } else {
      logger.error(e as Error, `Retries failed after ${RETRY_COUNT}`);
      throw e;
    }
  }
}

// When dealing with Axios errors use shouldRetry
export async function retryOnFailAxios<T>(request: () => Promise<T>, statusCodes: number[]): Promise<T> {
  return retryOnFail(request, (e) => !!statusCodes.find((t) => t === e?.response?.status));
}
