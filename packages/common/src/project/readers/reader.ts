// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import {IPackageJson} from 'package-json-type';
import {IPFS_REGEX} from '../../constants';
import {getProjectRootAndManifest} from '../../project';
import {GithubReader} from './github-reader';
import {IPFSReader} from './ipfs-reader';
import {LocalReader} from './local-reader';

export type ReaderOptions = {
  ipfs?: string;
  ipfsHeaders?: Record<string, string>;
};

export interface Reader {
  getProjectSchema(): Promise<unknown | undefined>;
  getPkg(): Promise<IPackageJson | undefined>;
  getFile(file: string): Promise<string | undefined>;
  root: string | undefined;
}

export class ReaderFactory {
  // eslint-disable-next-line @typescript-eslint/require-await
  static async create(location: string, options?: ReaderOptions): Promise<Reader> {
    // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
    const githubMatch = location.match(/https:\/\/github.com\/([\w-_]+\/[\w-_]+)/i);
    if (githubMatch) {
      return new GithubReader(githubMatch[1]);
    }

    const ipfsMatch = location.match(IPFS_REGEX);
    if (ipfsMatch) {
      return new IPFSReader(location.replace('ipfs://', ''), options.ipfs, options.ipfsHeaders);
    }

    //local mode
    if (fs.existsSync(location)) {
      const project = getProjectRootAndManifest(location);
      return new LocalReader(project.root, project.manifest);
    }

    throw new Error(`unknown location: ${location}`);
  }
}
