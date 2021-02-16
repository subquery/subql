// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

export async function timeout<T>(promise: Promise<T>, sec: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('promise timeout')), sec * 1000);
    }),
  ]);
}
