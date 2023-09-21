// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isEqual, unionWith} from 'lodash';
import {getLogger} from '../logger';
import {CacheMetadataModel} from './storeCache/cacheMetadata';

const logger = getLogger('dynamic-ds');

const METADATA_KEY = 'dynamicDatasources';
const TEMP_DS_PREFIX = 'ds_';

export interface DatasourceParams {
  templateName: string;
  args?: Record<string, unknown>;
  startBlock: number;
}

export interface IDynamicDsService<DS> {
  dynamicDatasources: DS[];
  createDynamicDatasource(params: DatasourceParams): Promise<DS>;
  getDynamicDatasources(forceReload?: boolean): Promise<DS[]>;
}

export abstract class DynamicDsService<DS> implements IDynamicDsService<DS> {
  private _metadata?: CacheMetadataModel;
  private tempDsRecords: Record<string, string> = {};

  private _datasources?: DS[];

  async init(metadata: CacheMetadataModel): Promise<void> {
    this._metadata = metadata;

    this._datasources = await this.loadDynamicDatasources();
  }

  get dynamicDatasources(): DS[] {
    if (!this._datasources) {
      throw new Error('DynamicDsService has not been initialized');
    }
    return this._datasources;
  }

  private get metadata(): CacheMetadataModel {
    if (!this._metadata) {
      throw new Error('DynamicDsService has not been initialized');
    }
    return this._metadata;
  }

  /**
   * remove dynamic ds that is created after this height
   * @param targetHeight this height is exclusive
   */
  async resetDynamicDatasource(targetHeight: number): Promise<void> {
    const dynamicDs = await this.getDynamicDatasourceParams();
    if (dynamicDs.length !== 0) {
      const filteredDs = dynamicDs.filter((ds) => ds.startBlock <= targetHeight);
      const dsRecords = JSON.stringify(filteredDs);
      this.metadata.set(METADATA_KEY, dsRecords);
    }
  }

  async createDynamicDatasource(params: DatasourceParams): Promise<DS> {
    try {
      const ds = await this.getDatasource(params);

      await this.saveDynamicDatasourceParams(params);

      logger.info(`Created new dynamic datasource from template: "${params.templateName}"`);

      if (!this._datasources) this._datasources = [];
      this._datasources.push(ds);

      return ds;
    } catch (e: any) {
      logger.error(e, 'Failed to create dynamic ds');
      process.exit(1);
    }
  }

  async getDynamicDatasources(forceReload?: boolean): Promise<DS[]> {
    // Workers should not cache this result in order to keep in sync
    if (!this._datasources || forceReload) {
      this._datasources = await this.loadDynamicDatasources();
    }

    return this._datasources;
  }

  private async loadDynamicDatasources(): Promise<DS[]> {
    try {
      const params = await this.getDynamicDatasourceParams();

      const dataSources = await Promise.all(params.map((params) => this.getDatasource(params)));

      logger.info(`Loaded ${dataSources.length} dynamic datasources`);

      return dataSources;
    } catch (e: any) {
      logger.error(`Unable to get dynamic datasources:\n${e.message}`);
      process.exit(1);
    }
  }

  deleteTempDsRecords(blockHeight: number): void {
    // Main thread will not have tempDsRecords with workers
    if (this.tempDsRecords) {
      delete this.tempDsRecords[TEMP_DS_PREFIX + blockHeight];
    }
  }

  private async getDynamicDatasourceParams(blockHeight?: number): Promise<DatasourceParams[]> {
    const record = await this.metadata.find(METADATA_KEY);

    let results: DatasourceParams[] = [];

    const metaResults: DatasourceParams[] = JSON.parse(record ?? '[]');
    if (metaResults.length) {
      results = [...metaResults];
    }

    if (blockHeight !== undefined) {
      const tempResults: DatasourceParams[] = JSON.parse(this.tempDsRecords?.[TEMP_DS_PREFIX + blockHeight] ?? '[]');
      if (tempResults.length) {
        results = unionWith(results, tempResults, isEqual);
      }
    }

    return results;
  }

  private async saveDynamicDatasourceParams(dsParams: DatasourceParams): Promise<void> {
    const existing = await this.getDynamicDatasourceParams(dsParams.startBlock);

    const dsRecords = JSON.stringify([...existing, dsParams]);
    this.metadata.set(METADATA_KEY, dsRecords);
    this.tempDsRecords = {
      ...this.tempDsRecords,
      [TEMP_DS_PREFIX + dsParams.startBlock]: dsRecords,
    };
  }

  protected abstract getDatasource(params: DatasourceParams): Promise<DS>;
}
