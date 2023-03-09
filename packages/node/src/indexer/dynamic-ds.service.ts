// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { isMainThread } from 'worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import {
  EthereumRuntimeDataSourceV0_3_0Impl,
  isCustomDs,
  isRuntimeDs,
} from '@subql/common-ethereum';
import { getLogger, MetadataRepo } from '@subql/node-core';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { cloneDeep, isEqual, unionWith } from 'lodash';
import { Transaction } from 'sequelize/types';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { DsProcessorService } from './ds-processor.service';

const logger = getLogger('dynamic-ds');

const METADATA_KEY = 'dynamicDatasources';
const TEMP_DS_PREFIX = 'ds_';

interface DatasourceParams {
  templateName: string;
  args?: Record<string, unknown>;
  startBlock: number;
}

@Injectable()
export class DynamicDsService {
  private metaDataRepo: MetadataRepo;
  private tempDsRecords: Record<string, string>;

  constructor(
    private readonly dsProcessorService: DsProcessorService,
    @Inject('ISubqueryProject') private readonly project: SubqueryProject,
  ) {}

  init(metaDataRepo: MetadataRepo): void {
    this.metaDataRepo = metaDataRepo;
  }

  private _datasources: SubqlProjectDs[];

  async resetDynamicDatasource(
    targetHeight: number,
    tx: Transaction,
  ): Promise<void> {
    const dynamicDs = await this.getDynamicDatasourceParams();
    if (dynamicDs.length !== 0) {
      const filteredDs = dynamicDs.filter(
        (ds) => ds.startBlock <= targetHeight,
      );
      const dsRecords = JSON.stringify(filteredDs);
      await this.metaDataRepo.upsert(
        { key: METADATA_KEY, value: dsRecords },
        { transaction: tx },
      );
    }
  }

  async createDynamicDatasource(
    params: DatasourceParams,
    tx: Transaction,
  ): Promise<SubqlProjectDs> {
    try {
      const ds = await this.getDatasource(params);

      await this.saveDynamicDatasourceParams(params, tx);

      logger.info(
        `Created new dynamic datasource from template: "${params.templateName}"`,
      );

      if (!this._datasources) this._datasources = [];
      this._datasources.push(ds);

      return ds;
    } catch (e) {
      logger.error(e.message);
      process.exit(1);
    }
  }

  async getDynamicDatasources(): Promise<SubqlProjectDs[]> {
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

  private async loadDynamicDatasources(): Promise<SubqlProjectDs[]> {
    try {
      const params = await this.getDynamicDatasourceParams();

      const dataSources = await Promise.all(
        params.map((params) => this.getDatasource(params)),
      );

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

  private async getDynamicDatasourceParams(
    blockHeight?: number,
  ): Promise<DatasourceParams[]> {
    assert(this.metaDataRepo, `Model _metadata does not exist`);
    const record = await this.metaDataRepo.findByPk(METADATA_KEY);

    let results: DatasourceParams[] = [];

    const metaResults: DatasourceParams[] = JSON.parse(
      (record?.value as string) ?? '[]',
    );
    if (metaResults.length) {
      results = [...metaResults];
    }

    if (blockHeight !== undefined) {
      const tempResults: DatasourceParams[] = JSON.parse(
        this.tempDsRecords?.[TEMP_DS_PREFIX + blockHeight] ?? '[]',
      );
      if (tempResults.length) {
        results = unionWith(results, tempResults, isEqual);
      }
    }

    return results;
  }

  private async saveDynamicDatasourceParams(
    dsParams: DatasourceParams,
    tx: Transaction,
  ): Promise<void> {
    const existing = await this.getDynamicDatasourceParams(dsParams.startBlock);

    assert(this.metaDataRepo, `Model _metadata does not exist`);
    const dsRecords = JSON.stringify([...existing, dsParams]);
    await this.metaDataRepo
      .upsert({ key: METADATA_KEY, value: dsRecords }, { transaction: tx })
      .then(() => {
        this.tempDsRecords = {
          ...this.tempDsRecords,
          [TEMP_DS_PREFIX + dsParams.startBlock]: dsRecords,
        };
      });
  }

  private async getDatasource(
    params: DatasourceParams,
  ): Promise<SubqlProjectDs> {
    const template = cloneDeep(
      this.project.templates?.find((t) => t.name === params.templateName),
    );

    if (!template) {
      throw new Error(
        `Unable to find matching template in project for name: "${params.templateName}"`,
      );
    }

    const dsObj = {
      ...template,
      startBlock: params.startBlock,
    } as SubqlProjectDs;
    delete dsObj.name;
    try {
      if (isCustomDs(dsObj)) {
        dsObj.processor.options = {
          ...dsObj.processor.options,
          ...params.args,
        };
        await this.dsProcessorService.validateCustomDs([dsObj]);
      } else if (isRuntimeDs(dsObj)) {
        dsObj.options = {
          ...dsObj.options,
          ...params.args,
        };

        const parsedDs = plainToClass(
          EthereumRuntimeDataSourceV0_3_0Impl,
          dsObj,
        );

        const errors = validateSync(parsedDs, {
          whitelist: true,
          forbidNonWhitelisted: false,
        });
        if (errors.length) {
          throw new Error(
            `Dynamic ds is invalid\n${errors
              .map((e) => e.toString())
              .join('\n')}`,
          );
        }
      }
      return dsObj;
    } catch (e) {
      throw new Error(`Unable to create dynamic datasource.\n ${e.message}`);
    }
  }
}
