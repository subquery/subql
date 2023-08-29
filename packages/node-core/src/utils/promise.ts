// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

//deprecate method, use delay from @subql/common
export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

export async function timeout<T>(promise: Promise<T>, sec: number): Promise<T> {
  // so we can have a more comprehensive error stack
  const err = new Error('timeout');
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

function backoff(attempt: number): number {
  return Math.pow(2, attempt) * 1000; // Exponential backoff
}

export function retryWithBackoff<T>(
  tryFunction: () => Promise<T>,
  onError: (error: any) => void,
  onMaxAttempts: () => void,
  attempt = 0,
  maxAttempts = 5
): NodeJS.Timeout | undefined {
  if (attempt >= maxAttempts) {
    onMaxAttempts();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const timeout = setTimeout(async () => {
      try {
        await tryFunction();
      } catch (error) {
        onError(error);
        retryWithBackoff(tryFunction, onError, onMaxAttempts, attempt + 1, maxAttempts);
      }
    }, backoff(attempt));

    return timeout;
  }
}
