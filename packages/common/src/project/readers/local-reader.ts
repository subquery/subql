// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as fs from 'fs';
import * as path from 'path';
import {Reader} from '@subql/types-core';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {extensionIsYamlOrJSON} from '../../project';

export class LocalReader implements Reader {
  constructor(private readonly projectPath: string, private readonly manifestPath: string) {}

  get root(): string {
    return path.resolve(this.projectPath);
  }

  async getPkg(): Promise<IPackageJson | undefined> {
    return yaml.load(await this.getFile('package.json')) as IPackageJson;
  }

  async getProjectSchema(unsafe = false): Promise<unknown | undefined> {
    if (!fs.existsSync(this.manifestPath)) {
      return Promise.resolve(undefined);
    }
    const {ext} = path.parse(this.manifestPath);
    if (extensionIsYamlOrJSON(ext)) {
      return yaml.load(fs.readFileSync(this.manifestPath, 'utf-8'));
    }
  }

  async getFile(fileName: string): Promise<string | undefined> {
    const file = path.resolve(this.projectPath, fileName);
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
