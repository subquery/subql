// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import path from 'path';
import { loadFromJsonOrYaml, ProjectNetworkConfig } from '@subql/common';
import { last } from 'lodash';
import { LevelWithSilent } from 'pino';
import { assign } from '../utils/object';

export type NetworkRegistry = Record<
  string /*genesisHash*/,
  ProjectNetworkConfig
>;

export interface IConfig {
  readonly configDir?: string;
  readonly subquery: string;
  readonly subqueryName: string;
  readonly localMode: boolean;
  readonly batchSize: number;
  readonly timeout: number;
  readonly debug: boolean;
  readonly preferRange: boolean;
  readonly networkEndpoint?: string;
  readonly networkDictionary?: string;
  readonly networkRegistry: NetworkRegistry;
  readonly outputFmt?: 'json';
  readonly logLevel?: LevelWithSilent;
  readonly queryLimit: number;
  readonly indexCountLimit: number;
  readonly timestampField: boolean;
  readonly proofOfIndex: boolean;
}

export type MinConfig = Partial<Omit<IConfig, 'subqueryName' | 'subquery'>> &
  Pick<IConfig, 'subqueryName' | 'subquery'>;

const DEFAULT_CONFIG = {
  localMode: false,
  batchSize: 100,
  timeout: 900,
  preferRange: false,
  debug: false,
  queryLimit: 100,
  indexCountLimit: 10,
  timestampField: true,
  proofOfIndex: false,
  networkRegistry: {
    /* TODO provide a default list */
    '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': {
      endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
      dictionary:
        'https://api.subquery.network/sq/subquery/dictionary-polkadot',
    },
  },
};

export class NodeConfig implements IConfig {
  private readonly _config: IConfig;

  static fromFile(
    filePath: string,
    configFromArgs?: Partial<IConfig>,
  ): NodeConfig {
    const fileInfo = path.parse(filePath);

    const config = assign(loadFromJsonOrYaml(filePath), configFromArgs, {
      configDir: fileInfo.dir,
    }) as IConfig;
    return new NodeConfig(config);
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

  get networkEndpoint(): string | undefined {
    return this._config.networkEndpoint;
  }

  get networkDictionary(): string | undefined {
    return this._config.networkDictionary;
  }

  get networkRegistry(): NetworkRegistry {
    return this._config.networkRegistry;
  }

  get timeout(): number {
    return this._config.timeout;
  }

  get debug(): boolean {
    return this._config.debug;
  }
  get preferRange(): boolean {
    return this._config.preferRange;
  }

  get outputFmt(): 'json' | undefined {
    return this._config.outputFmt;
  }

  get logLevel(): LevelWithSilent {
    return this.debug ? 'debug' : this._config.logLevel;
  }

  get queryLimit(): number {
    return this._config.queryLimit;
  }

  get indexCountLimit(): number {
    return this._config.indexCountLimit;
  }

  get timestampField(): boolean {
    return this._config.timestampField;
  }

  get proofOfIndex(): boolean {
    return this._config.proofOfIndex;
  }

  merge(config: Partial<IConfig>): this {
    assign(this._config, config);
    return this;
  }
}
