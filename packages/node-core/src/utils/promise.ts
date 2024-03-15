// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

//deprecate method, use delay from @subql/common
export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

export async function timeout<T>(promise: Promise<T>, sec: number, errMsg = 'timeout'): Promise<T> {
  // so we can have a more comprehensive error stack
  const err = new Error(errMsg);
  let timeout: NodeJS.Timeout;
  return Promise.race([
    promise.then(
      (r) => {
        clearTimeout(timeout);
        return r;
      },
      (e) => {
        clearTimeout(timeout);
        throw e;
      }
    ),
    new Promise<never>((resolve, reject) => {
      timeout = setTimeout(() => reject(err), sec * 1000);
    }),
  ]);
}

export class BackoffError extends Error {
  readonly lastError: any;

  constructor(lastError: any) {
    super('Maximum number of retries reached');
    this.lastError = lastError;
  }
}

export function isBackoffError(error: any): error is BackoffError {
  return error instanceof BackoffError;
}

async function backoffRetryInternal<T>(fn: () => Promise<T>, maxAttempts: number, currentAttempt = 0): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (maxAttempts - 1 === currentAttempt) {
      throw new BackoffError(e);
    }
    await delay(Math.pow(2, currentAttempt));
    return backoffRetryInternal(fn, maxAttempts, currentAttempt + 1);
  }
}

export async function backoffRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  return backoffRetryInternal(fn, attempts);
}

/* eslint-disable @typescript-eslint/no-misused-promises */
export async function raceFulfilled<T = any>(promises: Promise<T>[]): Promise<{result: T; fulfilledIndex: number}> {
  //eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    let hasFulfilled = false;

    promises.forEach(async (promise, index) => {
      try {
        const result = await promise;
        if (!hasFulfilled) {
          hasFulfilled = true;
          resolve({result, fulfilledIndex: index});
        }
      } catch (error) {
        // Ignore rejections
      }
    });

    // Check if all promises were rejected
    const results = await Promise.allSettled(promises);
    if (!hasFulfilled && results.every((result) => result.status === 'rejected')) {
      reject(new Error('All promises were rejected'));
    }
  });
}
