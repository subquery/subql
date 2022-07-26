// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {existsSync, readFileSync} from 'fs';
import axios from 'axios';
import cli, {ux} from 'cli-ux';
import inquirer, {Inquirer} from 'inquirer';

export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

export async function valueOrPrompt<T>(value: T, msg: string, error: string): Promise<T> {
  if (value) return value;
  try {
    return await cli.prompt(msg);
  } catch (e) {
    throw new Error(error);
  }
}

export async function promptWithDefaultValues(
  promptType: Inquirer | typeof ux,
  msg: string,
  defaultValue?: string,
  choices?: string[],
  required?: boolean
): Promise<string> {
  const promptValue =
    promptType === inquirer
      ? (
          await promptType.prompt({
            name: 'runnerVersions',
            message: msg,
            type: 'list',
            choices: choices,
          })
        ).runnerVersions
      : await promptType.prompt(msg, {default: defaultValue, required: required});
  return promptValue;
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

export function errorHandle(e: any, msg: string): string {
  if (axios.isAxiosError(e) as any) {
    throw new Error(`${msg} ${e.response.data.message}`);
  } else {
    throw new Error(`${msg} ${e.message}`);
  }
}

export function buildProjectKey(org: string, projectName: string): string {
  return encodeURIComponent(`${org}/${projectName}`);
}
