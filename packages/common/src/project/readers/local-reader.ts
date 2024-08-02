// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {Reader} from '@subql/types-core';
import yaml from 'js-yaml';
import type {IPackageJson} from 'package-json-type';
import {extensionIsYamlOrJSON} from '../../project';

export class LocalReader implements Reader {
  constructor(private readonly projectPath: string, private readonly manifestPath: string) {}

  get root(): string {
    return path.resolve(this.projectPath);
  }

  async getPkg(): Promise<IPackageJson> {
    const pkg = await this.getFile('package.json');
    return yaml.load(pkg) as IPackageJson;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getProjectSchema(): Promise<unknown> {
    assert(fs.existsSync(this.manifestPath), `Manifest file not found: ${this.manifestPath}`);
    const {ext} = path.parse(this.manifestPath);
    assert(extensionIsYamlOrJSON(ext), `Manifest file must be a yaml or json file: ${this.manifestPath}`);

    return yaml.load(fs.readFileSync(this.manifestPath, 'utf-8'));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getFile(fileName: string): Promise<string> {
    const file = path.resolve(this.projectPath, fileName);
    assert(fs.existsSync(file), `projectPath not found: ${file}`);

    return fs.readFileSync(file, 'utf-8');
  }
}
