// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {getFileContent, loadFromJsonOrYaml} from '@subql/common';
import {last} from 'lodash';
import {LevelWithSilent} from 'pino';
import {getLogger} from '../logger';
import {assign} from '../utils/object';

const logger = getLogger('configure');

export interface IConfig {
  readonly subquery: string;
  readonly subqueryName?: string;
  readonly dbSchema?: string;
  readonly localMode: boolean;
  readonly batchSize: number;
  readonly timeout: number;
  readonly blockTime: number;
  readonly debug: boolean;
  readonly preferRange: boolean;
  readonly networkEndpoint?: string;
  readonly networkDictionary?: string;
  readonly sponsoredDictionary?: string;
  readonly outputFmt?: 'json';
  readonly logLevel?: LevelWithSilent;
  readonly queryLimit: number;
  readonly indexCountLimit: number;
  readonly timestampField: boolean;
  readonly proofOfIndex: boolean;
  readonly mmrPath?: string;
  readonly ipfs?: string;
  readonly dictionaryTimeout: number;
  readonly workers?: number;
  readonly profiler?: boolean;
  readonly unsafe?: boolean;
  readonly subscription: boolean;
  readonly disableHistorical: boolean;
  readonly multiChain: boolean;
  readonly reindex?: number;
  readonly unfinalizedBlocks?: boolean;
  readonly pgCa?: string;
  readonly pgKey?: string;
  readonly pgCert?: string;
}

export type MinConfig = Partial<Omit<IConfig, 'subquery'>> & Pick<IConfig, 'subquery'>;

const DEFAULT_CONFIG = {
  localMode: false,
  batchSize: 100,
  timeout: 900,
  blockTime: 6000,
  preferRange: false,
  debug: false,
  queryLimit: 100,
  indexCountLimit: 10,
  timestampField: true,
  proofOfIndex: false,
  dictionaryTimeout: 30,
  profiler: false,
  subscription: false,
  disableHistorical: false,
  multiChain: false,
  unfinalizedBlocks: false,
};

export class NodeConfig implements IConfig {
  private readonly _config: IConfig;

  static fromFile(filePath: string, configFromArgs?: Partial<IConfig>): NodeConfig {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Load config from file ${filePath} is not exist`);
    }
    let configFromFile: unknown;
    try {
      configFromFile = loadFromJsonOrYaml(filePath);
    } catch (e) {
      logger.error(`failed to load config file, ${e}`);
      throw e;
    }

    const config = assign(configFromFile, configFromArgs) as IConfig;
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

  get sponsoredDictionary(): string {
    return this._config.sponsoredDictionary;
  }

  get timeout(): number {
    return this._config.timeout;
  }

  get blockTime(): number {
    return this._config.blockTime;
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

  get dictionaryTimeout(): number {
    return this._config.dictionaryTimeout;
  }

  get mmrPath(): string {
    return this._config.mmrPath ?? `.mmr/${this.subqueryName}.mmr`;
  }
  get ipfs(): string {
    return this._config.ipfs;
  }

  get dbSchema(): string {
    return this._config.dbSchema ?? this.subqueryName;
  }

  get workers(): number {
    return this._config.workers;
  }

  get profiler(): boolean {
    return this._config.profiler;
  }

  get unsafe(): boolean {
    return this._config.unsafe;
  }

  get subscription(): boolean {
    return this._config.subscription;
  }

  get disableHistorical(): boolean {
    return this._config.disableHistorical;
  }

  get multiChain(): boolean {
    return this._config.multiChain;
  }

  get unfinalizedBlocks(): boolean {
    return this._config.unfinalizedBlocks;
  }

  get isPostgresSecureConnection(): boolean {
    return !!this._config.pgCa;
  }

  get postgresCACert(): string | undefined {
    if (!this._config.pgCa) {
      return undefined;
    }
    try {
      return getFileContent(this._config.pgCa, 'postgres ca cert');
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  get postgresClientKey(): string | undefined {
    if (!this._config.pgKey) {
      return undefined;
    }

    try {
      return getFileContent(this._config.pgKey, 'postgres client key');
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  get postgresClientCert(): string | undefined {
    if (!this._config.pgCert) {
      return undefined;
    }
    try {
      return getFileContent(this._config.pgCert, 'postgres client cert');
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  merge(config: Partial<IConfig>): this {
    assign(this._config, config);
    return this;
  }
}
