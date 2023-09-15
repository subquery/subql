// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {Reader} from '@subql/types-core';
import axios, {AxiosInstance} from 'axios';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {DEFAULT_MANIFEST} from '../utils';

export class GithubReader implements Reader {
  private readonly api: AxiosInstance;
  private defaultBranch: string;

  constructor(private readonly key: string) {
    this.api = axios.create({
      baseURL: `https://raw.githubusercontent.com/${key}`,
    });
  }

  get root(): undefined {
    return undefined;
  }

  async getPkg(): Promise<IPackageJson | undefined> {
    return this.getFile('package.json') as Promise<unknown> as Promise<IPackageJson | undefined>;
  }

  async getProjectSchema(): Promise<unknown | undefined> {
    // Github reader not support ts manifest.
    const projectYaml = await this.getFile(DEFAULT_MANIFEST);
    if (projectYaml === undefined) {
      throw new Error('Fetch project from github got undefined');
    }
    return yaml.load(projectYaml);
  }

  async getFile(fileName: string): Promise<string | undefined> {
    try {
      const branch = await this.getDefaultBranch();
      const {data} = await this.api.get(path.join(branch, fileName));

      return data;
    } catch (err) {
      return undefined;
    }
  }

  private async getDefaultBranch(): Promise<string> {
    if (this.defaultBranch) {
      return this.defaultBranch;
    }
    const {data} = await axios.get(`https://api.github.com/repos/${this.key}`);
    this.defaultBranch = data.default_branch;
    return this.defaultBranch;
  }
}
