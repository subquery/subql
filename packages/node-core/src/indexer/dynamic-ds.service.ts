// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {isEqual, unionWith} from 'lodash';
import {Transaction} from 'sequelize/types';
import {getLogger} from '../logger';
import {MetadataRepo} from './entities';

const logger = getLogger('dynamic-ds');

const METADATA_KEY = 'dynamicDatasources';
const TEMP_DS_PREFIX = 'ds_';

export interface DatasourceParams {
  templateName: string;
  args?: Record<string, unknown>;
  startBlock: number;
}

export interface IDynamicDsService<DS> {
  createDynamicDatasource(params: DatasourceParams): Promise<DS>;
  getDynamicDatasources(): Promise<DS[]>;
}

export abstract class DynamicDsService<DS> implements IDynamicDsService<DS> {
  private metaDataRepo: MetadataRepo;
  private tempDsRecords: Record<string, string>;

  private _datasources: DS[];
  private tx: Transaction;

  init(metaDataRepo: MetadataRepo): void {
    this.metaDataRepo = metaDataRepo;
  }

  setTransaction(tx: Transaction): void {
    this.tx = tx;
  }

  async resetDynamicDatasource(targetHeight: number, tx: Transaction): Promise<void> {
    const dynamicDs = await this.getDynamicDatasourceParams();
    if (dynamicDs.length !== 0) {
      const filteredDs = dynamicDs.filter((ds) => ds.startBlock <= targetHeight);
      const dsRecords = JSON.stringify(filteredDs);
      await this.metaDataRepo.upsert({key: METADATA_KEY, value: dsRecords}, {transaction: tx});
    }
  }

  async createDynamicDatasource(params: DatasourceParams): Promise<DS> {
    try {
      if (!this.tx) {
        throw new Error('Transaction must be set on service');
      }

      const ds = await this.getDatasource(params);

      await this.saveDynamicDatasourceParams(params, this.tx);

      logger.info(`Created new dynamic datasource from template: "${params.templateName}"`);

      if (!this._datasources) this._datasources = [];
      this._datasources.push(ds);

      return ds;
    } catch (e) {
      logger.error(e, 'Failed to create dynamic ds');
      process.exit(1);
    }
  }

  async getDynamicDatasources(): Promise<DS[]> {
    // Workers should not cache this result in order to keep in sync
    if (!this._datasources) {
      this._datasources = await this.loadDynamicDatasources();
    }

    return this._datasources;
  }

  // This is used to sync between worker threads
  async reloadDynamicDatasources(): Promise<void> {
    this._datasources = await this.loadDynamicDatasources();
  }

  private async loadDynamicDatasources(): Promise<DS[]> {
    try {
      const params = await this.getDynamicDatasourceParams();

      const dataSources = await Promise.all(params.map((params) => this.getDatasource(params)));

      logger.info(`Loaded ${dataSources.length} dynamic datasources`);

      return dataSources;
    } catch (e) {
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
    assert(this.metaDataRepo, `Model _metadata does not exist`);
    const record = await this.metaDataRepo.findByPk(METADATA_KEY);

    let results: DatasourceParams[] = [];

    const metaResults: DatasourceParams[] = JSON.parse((record?.value as string) ?? '[]');
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

  private async saveDynamicDatasourceParams(dsParams: DatasourceParams, tx: Transaction): Promise<void> {
    const existing = await this.getDynamicDatasourceParams(dsParams.startBlock);

    assert(this.metaDataRepo, `Model _metadata does not exist`);
    const dsRecords = JSON.stringify([...existing, dsParams]);
    await this.metaDataRepo.upsert({key: METADATA_KEY, value: dsRecords}, {transaction: tx}).then(() => {
      this.tempDsRecords = {
        ...this.tempDsRecords,
        [TEMP_DS_PREFIX + dsParams.startBlock]: dsRecords,
      };
    });
  }

  protected abstract getDatasource(params: DatasourceParams): Promise<DS>;
}
