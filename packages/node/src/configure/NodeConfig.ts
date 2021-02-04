// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { last } from 'lodash';
import parseJson from 'parse-json';
import { assign } from '../utils/object';

export interface IConfig {
  readonly configDir?: string;
  readonly subquery: string;
  readonly subqueryName: string;
  readonly localMode: boolean;
  readonly batchSize: number;
  readonly debug: boolean;
  readonly preferRange: boolean;
}

export type MinConfig = Partial<Omit<IConfig, 'subqueryName' | 'subquery'>> &
  Pick<IConfig, 'subqueryName' | 'subquery'>;

const DEFAULT_CONFIG = {
  localMode: false,
  batchSize: 100,
  preferRange: false,
  debug: false,
};

export class NodeConfig implements IConfig {
  private readonly _config: IConfig;

  static fromFile(
    filePath: string,
    configFromArgs?: Partial<IConfig>,
  ): NodeConfig {
    const fileInfo = path.parse(filePath);
    const rawContent = fs.readFileSync(filePath);
    let content: IConfig;
    if (fileInfo.ext === '.json') {
      content = parseJson(rawContent.toString(), filePath);
    } else if (fileInfo.ext === '.yaml' || fileInfo.ext === '.yml') {
      content = yaml.load(rawContent.toString()) as IConfig;
    } else {
      throw new Error(
        `extension ${fileInfo.ext} of provided config file not supported`,
      );
    }
    content = assign(content, configFromArgs, { configDir: fileInfo.dir });
    return new NodeConfig(content);
  }

  constructor(config: MinConfig) {
    this._config = assign({}, DEFAULT_CONFIG, config);
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

  get batchSize(): number {
    return this._config.batchSize;
  }

  get debug(): boolean {
    return this._config.debug;
  }

  get preferRange(): boolean {
    return this._config.preferRange;
  }

  merge(config: Partial<IConfig>): this {
    assign(this._config, config);
    return this;
  }
}
