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

export enum MmrStoreType {
  File = 'file',
  Postgres = 'postgres',
}

export interface IConfig {
  readonly subquery: string;
  readonly subqueryName?: string;
  readonly dbSchema?: string;
  readonly batchSize: number;
  readonly timeout: number;
  readonly blockTime: number;
  readonly debug: boolean;
  readonly preferRange: boolean;
  readonly networkEndpoint?: string[];
  readonly networkDictionary?: string;
  readonly dictionaryResolver?: string | false;
  readonly outputFmt?: 'json';
  readonly logLevel: LevelWithSilent;
  readonly queryLimit: number;
  readonly indexCountLimit: number;
  readonly timestampField: boolean;
  readonly proofOfIndex: boolean;
  readonly mmrStoreType: MmrStoreType;
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
  readonly storeCacheThreshold: number;
  readonly storeGetCacheSize: number;
  readonly storeCacheAsync: boolean;
  readonly scaleBatchSize?: boolean;
  readonly storeFlushInterval: number;
  readonly isTest?: boolean;
  readonly root?: string;
}

export type MinConfig = Partial<Omit<IConfig, 'subquery'>> & Pick<IConfig, 'subquery'>;

const DEFAULT_CONFIG = {
  logLevel: 'info',
  batchSize: 100,
  timeout: 900,
  blockTime: 6000,
  preferRange: false,
  debug: false,
  queryLimit: 100,
  indexCountLimit: 10,
  timestampField: true,
  proofOfIndex: false,
  mmrStoreType: MmrStoreType.Postgres,
  dictionaryTimeout: 30,
  profiler: false,
  subscription: false,
  disableHistorical: false,
  multiChain: false,
  unfinalizedBlocks: false,
  storeCacheThreshold: 1000,
  storeGetCacheSize: 500,
  storeCacheAsync: true,
  storeFlushInterval: 5,
};

export class NodeConfig implements IConfig {
  private readonly _config: IConfig;
  private readonly _isTest: boolean;

  static fromFile(filePath: string, configFromArgs?: Partial<IConfig>, isTest?: boolean): NodeConfig {
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
    return new NodeConfig(config, isTest);
  }

  static rebaseWithArgs(config: NodeConfig, configFromArgs?: Partial<IConfig>, isTest?: boolean): NodeConfig {
    const _config = assign({}, (config as any)._config, configFromArgs) as IConfig;
    return new NodeConfig(_config, isTest);
  }

  constructor(config: MinConfig, isTest?: boolean) {
    this._config = assign({}, DEFAULT_CONFIG, config);
    this._isTest = isTest ?? false;
  }

  get subquery(): string {
    assert(this._config.subquery);
    return this._config.subquery;
  }

  get subqueryName(): string {
    assert(this._config.subquery);
    const name = this._config.subqueryName ?? last(this.subquery.split(path.sep));
    if (!name) {
      throw new Error('Unable to get subquery name');
    }
    return name;
  }

  get batchSize(): number {
    return this._config.batchSize;
  }

  get networkEndpoints(): string[] | undefined {
    return typeof this._config.networkEndpoint === 'string'
      ? [this._config.networkEndpoint]
      : this._config.networkEndpoint;
  }

  get networkDictionary(): string | undefined {
    return this._config.networkDictionary;
  }

  get storeCacheThreshold(): number {
    return this._config.storeCacheThreshold;
  }

  get storeGetCacheSize(): number {
    return this._config.storeGetCacheSize;
  }

  get storeCacheAsync(): boolean {
    return !!this._config.storeCacheAsync;
  }

  get storeFlushInterval(): number {
    return this._config.storeFlushInterval;
  }

  get dictionaryResolver(): string | false {
    if (this._config.dictionaryResolver === 'false') {
      return false;
    }
    return this._config.dictionaryResolver ?? 'https://kepler-auth.subquery.network';
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

  get mmrStoreType(): MmrStoreType {
    return this._config.mmrStoreType;
  }

  get dictionaryTimeout(): number {
    return this._config.dictionaryTimeout;
  }

  get mmrPath(): string {
    return this._config.mmrPath ?? `.mmr/${this.subqueryName}.mmr`;
  }
  get ipfs(): string | undefined {
    return this._config.ipfs;
  }

  get dbSchema(): string {
    const schema = this._config.dbSchema ?? this.subqueryName;
    return this._isTest ? `test-${schema}` : schema;
  }

  get workers(): number | undefined {
    return this._config.workers;
  }

  get profiler(): boolean {
    return !!this._config.profiler;
  }

  get unsafe(): boolean {
    return !!this._config.unsafe;
  }

  get subscription(): boolean {
    return this._config.subscription;
  }

  get disableHistorical(): boolean {
    return this._isTest ? true : this._config.disableHistorical;
  }

  get multiChain(): boolean {
    return this._config.multiChain;
  }

  get unfinalizedBlocks(): boolean {
    return !!this._config.unfinalizedBlocks;
  }

  get isPostgresSecureConnection(): boolean {
    return !!this._config.pgCa;
  }

  get scaleBatchSize(): boolean {
    return !!this.scaleBatchSize;
  }

  get postgresCACert(): string | undefined {
    if (!this._config.pgCa) {
      return undefined;
    }
    try {
      return getFileContent(this._config.pgCa, 'postgres ca cert');
    } catch (e: any) {
      logger.error(e, 'Unable to get postges CA Cert');
      throw e;
    }
  }

  get postgresClientKey(): string | undefined {
    if (!this._config.pgKey) {
      return undefined;
    }

    try {
      return getFileContent(this._config.pgKey, 'postgres client key');
    } catch (e: any) {
      logger.error(e, 'Unable to get postgres client key');
      throw e;
    }
  }

  get postgresClientCert(): string | undefined {
    if (!this._config.pgCert) {
      return undefined;
    }
    try {
      return getFileContent(this._config.pgCert, 'postgres client cert');
    } catch (e: any) {
      logger.error(e, 'Unable to get postgres client cert');
      throw e;
    }
  }

  get root(): string | undefined {
    return this._config.root;
  }

  merge(config: Partial<IConfig>): this {
    assign(this._config, config);
    return this;
  }
}
