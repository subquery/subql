// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import {IPackageJson} from 'package-json-type';
import {GithubReader} from './github-reader';
import {LocalReader} from './local-reader';

export interface Reader {
  getProjectSchema(): Promise<unknown | undefined>;
  getPkg(): Promise<IPackageJson | undefined>;
}

export class ReaderFactory {
  static create(location: string): Reader {
    // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
    const githubMatch = location.match(/https:\/\/github.com\/([\w-_]+\/[\w-_]+)/i);
    if (githubMatch) {
      return new GithubReader(githubMatch[1]);
    }

    const stats = fs.statSync(location);
    if (stats.isDirectory()) {
      return new LocalReader(location);
    }

    throw new Error(`unknown location: ${location}`);
  }
}
