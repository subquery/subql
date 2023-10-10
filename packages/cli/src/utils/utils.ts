// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs, {existsSync, readFileSync} from 'fs';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import axios from 'axios';
import cli, {ux} from 'cli-ux';
import ejs from 'ejs';
import inquirer, {Inquirer} from 'inquirer';
import rimraf from 'rimraf';

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

export function addV(str: string | undefined) {
  if (str && !str.includes('v')) {
    return `v${str}`;
  }
  return str;
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

export function errorHandle(e: any, msg: string): Error {
  if (axios.isAxiosError(e) as any) {
    throw new Error(`${msg} ${e.response.data.message}`);
  } else {
    throw new Error(`${msg} ${e.message}`);
  }
}

export function buildProjectKey(org: string, projectName: string): string {
  return encodeURIComponent(`${org}/${projectName}`);
}

export async function renderTemplate(templatePath: string, outputPath: string, templateData: ejs.Data): Promise<void> {
  const data = await ejs.renderFile(templatePath, templateData);
  await fs.promises.writeFile(outputPath, data);
}

export async function prepareDirPath(path: string, recreate: boolean): Promise<void> {
  try {
    await promisify(rimraf)(path);
    if (recreate) {
      await fs.promises.mkdir(path, {recursive: true});
    }
  } catch (e) {
    throw new Error(`Failed to prepare ${path}: ${e.message}`);
  }
}

// oclif's default path resolver only applies when parsed as `--flag path`
// else it would not resolve, hence we need to resolve it manually.
export function resolveToAbsolutePath(inputPath: string): string {
  const regex = new RegExp(`^~(?=$|[/\\\\])`);
  return path.resolve(inputPath.replace(regex, os.homedir()));
}

export function isValidEnum<T extends Record<string, string>>(enumType: T, input: string): input is T[keyof T] {
  return Object.values(enumType).includes(input);
}

export function findReplace(manifest: string, replacer: RegExp, value: string): string {
  return manifest.replace(replacer, value);
}

export function extractFromTs(
  manifest: string,
  patterns: {[key: string]: RegExp}
): {[key: string]: string | string[] | null} {
  const result: {[key: string]: string | string[] | null} = {};

  for (const key in patterns) {
    const match = manifest.match(patterns[key]);

    if (key === 'endpoint' && match) {
      const cleanedMatch = match[1].trim().replace(/['"]/g, '');

      if (cleanedMatch.startsWith('[')) {
        result[key] = cleanedMatch
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/['"]/g, ''))
          .filter(Boolean);
      } else {
        result[key] = [cleanedMatch];
      }
    } else {
      result[key] = match ? match[1] : null;
    }
  }

  return result;

  return result;
}

// Cold validate on ts manifest, for generate scaffold command
export function validateEthereumTsManifest(manifest: string): boolean {
  const typePattern = /@subql\/types-ethereum/;
  const nodePattern = /@subql\/node-ethereum/;
  return !!typePattern.test(manifest) && !!nodePattern.test(manifest);
}
