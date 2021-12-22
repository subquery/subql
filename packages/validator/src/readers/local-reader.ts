// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import * as path from 'path';
import {loadFromJsonOrYaml} from '@subql/common';
import {IPackageJson} from 'package-json-type';
import {Reader} from './reader';

export class LocalReader implements Reader {
  constructor(private readonly projectPath: string) {}

  async getPkg(): Promise<IPackageJson | undefined> {
    return this.getFile('package.json');
  }

  async getProjectSchema(): Promise<unknown | undefined> {
    return this.getFile('project.yaml');
  }

  async getFile(fileName: string): Promise<unknown | undefined> {
    const file = path.join(this.projectPath, fileName);
    if (!fs.existsSync(file)) {
      return Promise.resolve(undefined);
    }
    try {
      return loadFromJsonOrYaml(file);
    } catch (e) {
      return undefined;
    }
  }
}
