// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {Reader} from './reader';

export class LocalReader implements Reader {
  constructor(private readonly projectPath: string) {}

  get root(): string {
    return this.projectPath;
  }

  async getPkg(): Promise<IPackageJson | undefined> {
    return yaml.load(await this.getFile('package.json')) as IPackageJson;
  }

  async getProjectSchema(): Promise<unknown | undefined> {
    return yaml.load(await this.getFile('project.yaml'));
  }

  async getFile(fileName: string): Promise<string | undefined> {
    const file = path.join(this.projectPath, fileName);
    if (!fs.existsSync(file)) {
      return Promise.resolve(undefined);
    }
    try {
      return fs.readFileSync(file, 'utf-8');
    } catch (e) {
      return undefined;
    }
  }
}
