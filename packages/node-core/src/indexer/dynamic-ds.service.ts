// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getLogger} from '../logger';
import {CacheMetadataModel} from './storeCache/cacheMetadata';

const logger = getLogger('dynamic-ds');

const METADATA_KEY = 'dynamicDatasources';

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
  private _datasources?: DS[];
  private _datasourceParams?: DatasourceParams[];

  protected abstract getDatasource(params: DatasourceParams): Promise<DS>;

  async init(metadata: CacheMetadataModel): Promise<void> {
    this._metadata = metadata;

    await this.getDynamicDatasources(true);
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
  // eslint-disable-next-line @typescript-eslint/require-await
  async resetDynamicDatasource(targetHeight: number): Promise<void> {
    if (this._datasourceParams && this._datasourceParams.length !== 0) {
      const filteredDs = this._datasourceParams.filter((ds) => ds.startBlock <= targetHeight);
      this.metadata.set(METADATA_KEY, filteredDs);
      await this.loadDynamicDatasources(filteredDs);
    }
  }

  async createDynamicDatasource(params: DatasourceParams): Promise<DS> {
    try {
      const ds = await this.getDatasource(params);
      this.metadata.setNewDynamicDatasource(params);

      logger.info(`Created new dynamic datasource from template: "${params.templateName}"`);

      if (!this._datasources) this._datasources = [];
      if (!this._datasourceParams) this._datasourceParams = [];
      this._datasources.push(ds);
      this._datasourceParams.push(params);

      return ds;
    } catch (e: any) {
      logger.error(e, 'Failed to create dynamic ds');
      process.exit(1);
    }
  }

  // Not force only seems to be used for project changes
  async getDynamicDatasources(forceReload?: boolean): Promise<DS[]> {
    // Workers should not cache this result in order to keep in sync
    if (!this._datasources || forceReload) {
      const params = (await this.metadata.find(METADATA_KEY)) ?? [];

      await this.loadDynamicDatasources(params);
    }

    // loadDynamicDatasources ensures this is set
    return this._datasources as DS[];
  }

  private async loadDynamicDatasources(params: DatasourceParams[]): Promise<void> {
    const dataSources = await Promise.all(params.map((params) => this.getDatasource(params)));

    logger.info(`Loaded ${dataSources.length} dynamic datasources`);
    this._datasourceParams = params;
    this._datasources = dataSources;
  }
}
