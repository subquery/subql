// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {existsSync, readFileSync} from 'fs';
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

export async function valueOrPrompt<T>(value: T, msg: string, error: string): Promise<T> {
  if (value) return value;
  try {
    return await cli.prompt(msg);
  } catch (e) {
    throw new Error(error);
  }
}

export async function checkToken(authToken_ENV: string, token_path: string): Promise<string> {
  let authToken = authToken_ENV;
  if (authToken_ENV) return authToken_ENV;
  if (existsSync(token_path)) {
    try {
      authToken = process.env.SUBQL_ACCESS_TOKEN ?? readFileSync(token_path, 'utf8');
    } catch (e) {
      return (authToken = await cli.prompt('Token cannot be found, Enter token'));
    }
  } else {
    authToken = await cli.prompt('Token cannot be found, Enter token');
    return authToken;
  }
}
