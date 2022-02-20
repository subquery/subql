// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import {getProjectRootAndManifest} from '@subql/common/project';
import {IPackageJson} from 'package-json-type';
import {GithubReader} from './github-reader';
import {IPFSReader} from './ipfs-reader';
import {LocalReader} from './local-reader';

export type ReaderOptions = {
  ipfs?: string;
};

export interface Reader {
  getProjectSchema(): Promise<unknown | undefined>;
  getPkg(): Promise<IPackageJson | undefined>;
  getFile(file: string): Promise<string | undefined>;
  root: string | undefined;
}

const CIDv0 = new RegExp(/Qm[1-9A-Za-z]{44}[^OIl]/i);
const CIDv1 = new RegExp(
  /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/i
);

export class ReaderFactory {
  // eslint-disable-next-line @typescript-eslint/require-await
  static async create(location: string, options?: ReaderOptions): Promise<Reader> {
    // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
    const githubMatch = location.match(/https:\/\/github.com\/([\w-_]+\/[\w-_]+)/i);
    if (githubMatch) {
      return new GithubReader(githubMatch[1]);
    }

    const locationWithoutSchema = location.replace('ipfs://', '');

    if (CIDv0.test(locationWithoutSchema) || CIDv1.test(locationWithoutSchema)) {
      return new IPFSReader(locationWithoutSchema, options.ipfs);
    }

    //local mode
    if (fs.existsSync(location)) {
      const project = getProjectRootAndManifest(location);
      return new LocalReader(project.root, project.manifest);
    }

    throw new Error(`unknown location: ${location}`);
  }
}
