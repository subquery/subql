// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import axios, {AxiosInstance} from 'axios';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {Reader} from './reader';

export class GithubReader implements Reader {
  private readonly api: AxiosInstance;
  private defaultBranch: string;

  constructor(private readonly key: string) {
    this.api = axios.create({
      baseURL: `https://raw.githubusercontent.com/${key}`,
    });
  }

  async getPkg(): Promise<IPackageJson | undefined> {
    try {
      const branch = await this.getDefaultBranch();
      return this.api.get(`${branch}/package.json`).then((r) => r.data);
    } catch (err) {
      return undefined;
    }
  }

  async getProjectSchema(): Promise<unknown | undefined> {
    try {
      const branch = await this.getDefaultBranch();
      const data = await this.api.get(`${branch}/project.yaml`).then((r) => r.data);
      return yaml.load(data);
    } catch (err) {
      return undefined;
    }
  }

  private async getDefaultBranch(): Promise<string> {
    if (this.defaultBranch) {
      return this.defaultBranch;
    }
    this.defaultBranch = await axios.get(`https://api.github.com/repos/${this.key}`).then((r) => r.data.default_branch);
    return this.defaultBranch;
  }
}
