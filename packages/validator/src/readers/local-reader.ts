// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {Reader} from './reader';

export class LocalReader implements Reader {
  constructor(private readonly projectPath: string) {}

  async getPkg(): Promise<IPackageJson | undefined> {
    const file = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(file)) {
      return Promise.resolve(undefined);
    }

    try {
      const data = JSON.parse(fs.readFileSync(file).toString());
      return Promise.resolve(data);
    } catch (err) {
      return Promise.resolve(undefined);
    }
  }

  async getProjectSchema(): Promise<unknown | undefined> {
    const file = path.join(this.projectPath, 'project.yaml');
    if (!fs.existsSync(file)) {
      return Promise.resolve(undefined);
    }

    try {
      const data = yaml.load(fs.readFileSync(file).toString());
      return Promise.resolve(data);
    } catch (err) {
      return Promise.resolve(undefined);
    }
  }
}
