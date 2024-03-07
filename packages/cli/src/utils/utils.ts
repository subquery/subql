// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs, {existsSync, readFileSync} from 'fs';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import {DEFAULT_MANIFEST, DEFAULT_TS_MANIFEST} from '@subql/common';
import {SubqlRuntimeHandler} from '@subql/common-ethereum';
import axios from 'axios';
import cli, {ux} from 'cli-ux';
import ejs from 'ejs';
import inquirer, {Inquirer} from 'inquirer';
import JSON5 from 'json5';
import rimraf from 'rimraf';
import {ACCESS_TOKEN_PATH} from '../constants';

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

export function addV(str: string | undefined):string {
  // replaced includes to first byte.
  if (str && str[0]!=='v') {
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

export async function checkToken(token_path: string = ACCESS_TOKEN_PATH): Promise<string> {
  const envToken = process.env.SUBQL_ACCESS_TOKEN;
  if (envToken) return envToken;
  if (existsSync(token_path)) {
    try {
      const authToken = readFileSync(token_path, 'utf8');
      if (!authToken) {
        return await cli.prompt('Token cannot be found, Enter token');
      }
    } catch (e) {
      return cli.prompt('Token cannot be found, Enter token');
    }
  } else {
    return cli.prompt('Token cannot be found, Enter token');
  }

  return authToken;
}

export function errorHandle(e: any, msg: string): Error {
  if (axios.isAxiosError(e) && e?.response?.data) {
    throw new Error(`${msg} ${e.response.data.message ?? e.response.data}`);
  }

  throw new Error(`${msg} ${e.message}`);
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

export function findMatchingIndices(
  content: string,
  startChar: string,
  endChar: string,
  startFrom = 0
): [number, number][] {
  //  JavaScript's regex engine does not support recursive patterns like (?1).
  //  This regex would work in engines that support recursion, such as PCRE (Perl-Compatible Regular Expressions).

  let openCount = 0;
  let startIndex: number;
  const pairs: [number, number][] = [];

  for (let i = startFrom; i < content.length; i++) {
    if (content[i] === startChar) {
      if (openCount === 0) startIndex = i;
      openCount++;
    } else if (content[i] === endChar) {
      openCount--;
      if (openCount === 0) {
        pairs.push([startIndex, i]);
        break;
      }
    }
  }
  if (openCount !== 0) throw new Error(`Unbalanced ${startChar} and ${endChar}`);

  return pairs;
}
export function findArrayIndicesTsManifest(content: string, key: string): [number, number] {
  const start = content.indexOf(`${key}:`);
  if (start === -1) throw new Error(`${key} not found`);
  const pairs = findMatchingIndices(content, '[', ']', start);

  if (pairs.length === 0) throw new Error(`${key} contains unbalanced brackets`);

  return pairs[0];
}
export function replaceArrayValueInTsManifest(content: string, key: string, newValue: string): string {
  const [startIndex, endIndex] = findArrayIndicesTsManifest(content, key);
  return content.slice(0, startIndex) + newValue + content.slice(endIndex + 1);
}
export function extractArrayValueFromTsManifest(content: string, key: string): string | null {
  const [startIndex, endIndex] = findArrayIndicesTsManifest(content, key);
  return content.slice(startIndex, endIndex + 1);
}

export function tsStringify(
  obj: SubqlRuntimeHandler | SubqlRuntimeHandler[] | string,
  indent = 2,
  currentIndent = 0
): string {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string' && obj.includes('EthereumHandlerKind')) {
      return obj; // Return the string as-is without quotes
    }
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const items = obj.map((item) => tsStringify(item, indent, currentIndent + indent));
    return `[\n${items.map((item) => ' '.repeat(currentIndent + indent) + item).join(',\n')}\n${' '.repeat(
      currentIndent
    )}]`;
  }

  const entries = Object.entries(obj);
  const result = entries.map(([key, value]) => {
    const valueStr = tsStringify(value, indent, currentIndent + indent);
    return `${' '.repeat(currentIndent + indent)}${key}: ${valueStr}`;
  });

  return `{\n${result.join(',\n')}\n${' '.repeat(currentIndent)}}`;
}

export function extractFromTs(
  manifest: string,
  patterns: {[key: string]: RegExp | undefined}
): {[key: string]: string | string[] | null} {
  const result: {[key: string]: string | string[] | null} = {};
  // TODO should extract then validate value type ?
  // check what the following char is after key
  const arrKeys = ['endpoint', 'topics'];
  const nestArr = ['dataSources', 'handlers'];
  for (const key in patterns) {
    if (!nestArr.includes(key)) {
      const match = manifest.match(patterns[key]);

      if (arrKeys.includes(key) && match) {
        const inputStr = match[1].replace(/`/g, '"');
        const jsonOutput = JSON5.parse(inputStr);
        result[key] = Array.isArray(jsonOutput) ? jsonOutput : [jsonOutput];
      } else {
        result[key] = match ? match[1] : null;
      }
    } else {
      result[key] = extractArrayValueFromTsManifest(manifest, key);
    }
  }

  return result;
}

export function splitArrayString(arrayStr: string): string[] {
  // Remove the starting and ending square brackets
  const content = arrayStr.trim().slice(1, -1).trim();
  const pairs: [number, number][] = [];
  let lastEndIndex = 0;

  while (lastEndIndex < content.length) {
    const newPairs = findMatchingIndices(content, '{', '}', lastEndIndex);
    if (newPairs.length === 0) break;
    pairs.push(newPairs[0]);
    lastEndIndex = newPairs[0][1] + 1;
  }

  return pairs.map(([start, end]) => {
    // Extract the string and further process to remove excess whitespace
    const extracted = content.slice(start, end + 1).trim();
    return extracted.replace(/\s+/g, ' ');
  });
}

// Cold validate on ts manifest, for generate scaffold command
export function validateEthereumTsManifest(manifest: string): boolean {
  const typePattern = /@subql\/types-ethereum/;
  const nodePattern = /@subql\/node-ethereum/;
  return !!typePattern.test(manifest) && !!nodePattern.test(manifest);
}

export function defaultYamlManifestPath(projectPath: string): string {
  return path.join(projectPath, DEFAULT_MANIFEST);
}

export function defaultTSManifestPath(projectPath: string): string {
  return path.join(projectPath, DEFAULT_TS_MANIFEST);
}
