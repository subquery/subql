// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs, {existsSync, readFileSync} from 'fs';
import os from 'os';
import path from 'path';
import {input} from '@inquirer/prompts';
import {
  DEFAULT_ENV,
  DEFAULT_ENV_DEVELOP,
  DEFAULT_ENV_DEVELOP_LOCAL,
  DEFAULT_ENV_LOCAL,
  DEFAULT_GIT_IGNORE,
  DEFAULT_MANIFEST,
  DEFAULT_TS_MANIFEST,
} from '@subql/common';
import axios from 'axios';
import ejs from 'ejs';
import JSON5 from 'json5';
import {rimraf} from 'rimraf';
import {ACCESS_TOKEN_PATH} from '../constants';

export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

export async function valueOrPrompt(
  value: string | undefined,
  msg: string,
  error: string
): Promise<NonNullable<string>> {
  if (value) return value;
  try {
    return await input({
      message: msg,
      required: true,
    });
  } catch (e) {
    throw new Error(error);
  }
}

export function addV<T extends string | undefined>(str: T): T {
  // replaced includes to first byte.
  if (str && str[0] !== 'v') {
    return `v${str}` as T;
  }
  return str;
}

export async function checkToken(token_path: string = ACCESS_TOKEN_PATH): Promise<string> {
  const reqInput = () => input({message: 'Token cannot be found, Enter token', required: true});

  const envToken = process.env.SUBQL_ACCESS_TOKEN;
  if (envToken) return envToken;
  if (existsSync(token_path)) {
    try {
      const authToken = readFileSync(token_path, 'utf8');
      if (!authToken) {
        return await reqInput();
      }
      return authToken.trim();
    } catch (e) {
      return reqInput();
    }
  } else {
    return reqInput();
  }
}

export function errorHandle(e: any, msg: string): Error {
  if (axios.isAxiosError(e) && e?.response?.data) {
    return new Error(`${msg} ${e.response.data.message ?? e.response.data}`);
  }

  return new Error(`${msg} ${e.message}`);
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
    await rimraf(path);
    if (recreate) {
      await fs.promises.mkdir(path, {recursive: true});
    }
  } catch (e: any) {
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
  let startIndex: number | undefined;
  const pairs: [number, number][] = [];

  for (let i = startFrom; i < content.length; i++) {
    if (content[i] === startChar) {
      if (openCount === 0) startIndex = i;
      openCount++;
    } else if (content[i] === endChar) {
      openCount--;
      if (openCount === 0) {
        assert(startIndex !== undefined, 'startIndex should be defined');
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
      const regExp = patterns[key];
      assert(regExp, `Pattern for ${key} is not defined`);
      const match = manifest.match(regExp);

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

export function defaultEnvPath(projectPath: string): string {
  return path.join(projectPath, DEFAULT_ENV);
}

export function defaultEnvDevelopPath(projectPath: string): string {
  return path.join(projectPath, DEFAULT_ENV_DEVELOP);
}

export function defaultEnvLocalPath(projectPath: string): string {
  return path.join(projectPath, DEFAULT_ENV_LOCAL);
}

export function defaultEnvDevelopLocalPath(projectPath: string): string {
  return path.join(projectPath, DEFAULT_ENV_DEVELOP_LOCAL);
}

export function defaultGitIgnorePath(projectPath: string): string {
  return path.join(projectPath, DEFAULT_GIT_IGNORE);
}

export function copyFolderSync(source: string, target: string): void {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, {recursive: true});
  }

  fs.readdirSync(source).forEach((item) => {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFolderSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}
