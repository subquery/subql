// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getLogger} from '../logger';
import {delay} from './promise';

const logger = getLogger('fetch');

const RETRY_COUNT = 5;

// TODO: generic type for the response
export async function retryOnFail(
  errorMessage: string,
  args: any, // should be height for cosmos and a bunch of other shit for avalanche
  request: (...args) => Promise<any>,
  statusCodes: number[],
  retries = RETRY_COUNT
): Promise<any> {
  try {
    return await request(args);
  } catch (e) {
    if (!statusCodes.find((target) => target === e.response.status)) throw e;

    if (retries > 0) {
      logger.warn(`${errorMessage}`);
      --retries;

      await delay(10);
      return request(args);
    } else {
      logger.error(e, `Retries failed after ${RETRY_COUNT}`);
      throw e;
    }
  }
}
