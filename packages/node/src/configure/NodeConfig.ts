// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { assignWith, isUndefined, last } from 'lodash';
import parseJson from 'parse-json';

export interface IConfig {
  readonly configDir?: string;
  readonly subquery: string;
  readonly subqueryName: string;
  readonly localMode: boolean;
}

export class NodeConfig implements IConfig {
  private readonly _config: IConfig;

  static fromFile(filePath: string): NodeConfig {
    const fileInfo = path.parse(filePath);
    const rawContent = fs.readFileSync(filePath);
    let content: IConfig;
    if (fileInfo.ext === '.json') {
      content = parseJson(rawContent.toString(), filePath);
    } else if (fileInfo.ext === '.yaml' || fileInfo.ext === '.yml') {
      content = yaml.load(rawContent.toString());
    } else {
      throw new Error(
        `extension ${fileInfo.ext} of provided config file not supported`,
      );
    }
    return new NodeConfig({ ...content, configDir: fileInfo.dir });
  }

  constructor(config: IConfig) {
    this._config = config;
  }

  get subquery(): string {
    assert(this._config.subquery);
    return this._config.subquery;
  }

  get subqueryName(): string {
    assert(this._config.subquery);
    return this._config.subqueryName ?? last(this.subquery.split(path.sep));
  }

  get configDir(): string {
    return this._config.configDir;
  }

  get localMode(): boolean {
    return this._config.localMode;
  }

  merge(config: Partial<IConfig>): this {
    assignWith(this._config, config, (objValue, srcValue) =>
      isUndefined(srcValue) ? objValue : srcValue,
    );
    return this;
  }
}
