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
  return Promise.race([
    promise,
    new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(err), sec * 1000);
    }),
  ]);
}
