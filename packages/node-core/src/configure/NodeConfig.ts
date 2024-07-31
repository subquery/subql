// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {getFileContent, loadFromJsonOrYaml, normalizeNetworkEndpoints} from '@subql/common';
import {IEndpointConfig} from '@subql/types-core';
import {last} from 'lodash';
import {LevelWithSilent} from 'pino';
import {getLogger} from '../logger';
import {assign} from '../utils/object';

const logger = getLogger('configure');

export interface IConfig {
  readonly subquery: string;
  readonly subqueryName?: string;
  readonly dbSchema?: string;
  readonly batchSize: number;
  readonly timeout: number;
  readonly blockTime: number;
  readonly debug?: string;
  readonly preferRange: boolean;
  readonly networkEndpoint?: Record<string, IEndpointConfig>;
  readonly primaryNetworkEndpoint?: [string, IEndpointConfig];
  readonly networkDictionary?: string[];
  readonly dictionaryRegistry: string;
  readonly outputFmt?: 'json';
  readonly logLevel: LevelWithSilent;
  readonly queryLimit: number;
  readonly indexCountLimit: number;
  readonly proofOfIndex: boolean;
  readonly ipfs?: string;
  readonly dictionaryTimeout: number;
  readonly dictionaryQuerySize: number;
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
  readonly storeCacheUpperLimit: number;
  readonly storeGetCacheSize: number;
  readonly storeCacheAsync: boolean;
  readonly storeFlushInterval: number;
  readonly isTest?: boolean;
  readonly root?: string;
  readonly allowSchemaMigration: boolean;
  readonly csvOutDir?: string;
  readonly monitorOutDir: string;
  readonly monitorFileSize?: number;
}

export type MinConfig = Partial<Omit<IConfig, 'subquery'>> & Pick<IConfig, 'subquery'>;

const DEFAULT_CONFIG = {
  logLevel: 'info',
  batchSize: 100,
  timeout: 900,
  blockTime: 6000,
  preferRange: false,
  debug: undefined,
  queryLimit: 100,
  indexCountLimit: 10,
  proofOfIndex: false,
  dictionaryTimeout: 30,
  dictionaryQuerySize: 10000,
  profiler: false,
  subscription: false,
  disableHistorical: false,
  multiChain: false,
  unfinalizedBlocks: false,
  storeCacheThreshold: 1000,
  storeCacheUpperLimit: 10000,
  storeGetCacheSize: 500,
  storeCacheAsync: true,
  storeFlushInterval: 5,
  allowSchemaMigration: false,
  monitorOutDir: './.monitor',
};

export class NodeConfig<C extends IConfig = IConfig> implements IConfig {
  protected readonly _config: C;
  protected readonly _isTest: boolean;

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

  static rebaseWithArgs(config: NodeConfig, configFromArgs?: Partial<IConfig>): NodeConfig {
    const _config = assign({}, (config as any)._config, configFromArgs);
    return new NodeConfig(_config, (config as any)._isTest);
  }

  constructor(config: MinConfig, isTest?: boolean) {
    this._config = assign({}, DEFAULT_CONFIG, config) as C;
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

  get networkEndpoints(): Record<string, IEndpointConfig> | undefined {
    return normalizeNetworkEndpoints(
      this._config.networkEndpoint as string | string[] | Record<string, IEndpointConfig>
    );
  }

  get primaryNetworkEndpoint(): [string, IEndpointConfig] | undefined {
    return this._config.primaryNetworkEndpoint;
    // if (!this._config.primaryNetworkEndpoint) {
    //   return undefined;
    // }
    // return [this._config.primaryNetworkEndpoint, {}];
  }

  get networkDictionaries(): string[] | undefined | false {
    return typeof this._config.networkDictionary === 'string'
      ? this._config.networkDictionary === 'false'
        ? false
        : [this._config.networkDictionary]
      : this._config.networkDictionary;
  }

  get allowSchemaMigration(): boolean {
    return this._config.allowSchemaMigration;
  }
  get storeCacheThreshold(): number {
    return this._config.storeCacheThreshold;
  }

  get storeCacheUpperLimit(): number {
    return this._config.storeCacheUpperLimit;
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

  get dictionaryRegistry(): string {
    if (this._config.dictionaryRegistry) {
      return this._config.dictionaryRegistry;
    }

    return 'https://github.com/subquery/templates/raw/main/dist/dictionary.json';
  }

  get timeout(): number {
    return this._config.timeout;
  }

  get blockTime(): number {
    return this._config.blockTime;
  }

  get debug(): string | undefined {
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

  get proofOfIndex(): boolean {
    return this._config.proofOfIndex;
  }

  get dictionaryTimeout(): number {
    return this._config.dictionaryTimeout;
  }

  get dictionaryQuerySize(): number {
    return this._config.dictionaryQuerySize;
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
    return this._isTest ? false : !!this._config.unfinalizedBlocks;
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

  get csvOutDir(): string | undefined {
    return this._config.csvOutDir;
  }

  get monitorOutDir(): string {
    return this._config.monitorOutDir;
  }

  get monitorFileSize(): number {
    const defaultMonitorFileSize = 200;
    // If user passed though yarg, we will record monitor file by this size, no matter poi or not
    // if user didn't pass through yarg, we will record monitor file by this default size only when poi is enabled
    return this._config.monitorFileSize ?? this._config.proofOfIndex ? defaultMonitorFileSize : 0;
  }

  merge(config: Partial<IConfig>): this {
    assign(this._config, config);
    return this;
  }
}
