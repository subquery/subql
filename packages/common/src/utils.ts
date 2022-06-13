// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import cli from 'cli-ux';

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

interface call_value_type {
  default?: string;
}
export async function valueOrPrompt(
  value: string | number | boolean,
  msg: string,
  error: string,
  apiCall?: Promise<string>
): Promise<any> {
  let call_value: call_value_type;

  if (value) return value;
  try {
    if (apiCall !== undefined) {
      call_value.default = await apiCall;

      console.log(JSON.stringify(call_value));
    }
    await cli.prompt(msg, call_value ?? call_value);
  } catch (e) {
    throw new Error(error);
  }
}
