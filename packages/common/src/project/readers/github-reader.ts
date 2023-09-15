// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import childProcess from 'child_process';
import fs, {writeFileSync} from 'fs';
import path from 'path';
import {Reader} from '@subql/types-core';
import axios, {AxiosInstance} from 'axios';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {DEFAULT_MANIFEST, DEFAULT_PKG, DEFAULT_TS_MANIFEST, makeTempDir} from '../utils';
import {loadProjectFromScript} from './readerSandbox';

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
    const projectTs = await this.getFile(DEFAULT_TS_MANIFEST);
    if (projectTs !== undefined) {
      try {
        return this.loadFromTs(projectTs);
      } catch (e) {
        // If load from ts manifest failed, try to load with yaml
        return this.loadFromYaml();
      }
    } else {
      return this.loadFromYaml();
    }
  }

  async getFile(fileName: string): Promise<string | undefined> {
    try {
      const branch = await this.getDefaultBranch();
      const {data} = await this.api.get(path.join(branch, fileName));

      return typeof data === 'object' ? JSON.stringify(data) : data;
    } catch (err) {
      return undefined;
    }
  }

  private async loadFromTs(projectTs: string): Promise<unknown> {
    const pkg = await this.getFile(DEFAULT_PKG);
    if (pkg === undefined) {
      throw new Error(`Github reader getProjectSchema failed, package.json not found`);
    }
    const tempPath = await makeTempDir();
    const projectPath = path.join(tempPath, DEFAULT_TS_MANIFEST);
    const pkgPath = path.join(tempPath, 'package.json');
    writeFileSync(pkgPath, pkg);
    writeFileSync(projectPath, projectTs);
    childProcess.execSync(`yarn`, {cwd: tempPath});
    const project = loadProjectFromScript(projectPath, this.root);
    // Clean temp folder
    fs.rmSync(tempPath, {recursive: true, force: true});
    return project;
  }

  private async loadFromYaml(): Promise<unknown> {
    const projectYaml = await this.getFile(DEFAULT_MANIFEST);
    if (projectYaml === undefined) {
      throw new Error('Fetch project from github got undefined');
    }
    return yaml.load(projectYaml);
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
