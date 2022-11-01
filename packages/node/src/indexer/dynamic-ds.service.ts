// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { isCustomCosmosDs, isRuntimeCosmosDs } from '@subql/common-cosmos';
import { getLogger, MetadataRepo } from '@subql/node-core';
import { cloneDeep, isEqual, unionWith } from 'lodash';
import type { Transaction } from 'sequelize';
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
    private readonly project: SubqueryProject,
  ) {}

  init(metaDataRepo: MetadataRepo): void {
    this.metaDataRepo = metaDataRepo;
  }

  private _datasources: SubqlProjectDs[];

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
      logger.error(e, 'Failed to create dynamic ds');
      process.exit(1);
    }
  }

  async getDynamicDatasources(): Promise<SubqlProjectDs[]> {
    if (!this._datasources) {
      try {
        const params = await this.getDynamicDatasourceParams();

        this._datasources = await Promise.all(
          params.map((params) => this.getDatasource(params)),
        );
      } catch (e) {
        logger.error(e, `Unable to get dynamic datasources`);
        process.exit(1);
      }
    }

    return this._datasources;
  }

  deleteTempDsRecords(blockHeight: number) {
    delete this.tempDsRecords[TEMP_DS_PREFIX + blockHeight];
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
      this.project.templates.find((t) => t.name === params.templateName),
    );

    if (!template) {
      throw new Error(
        `Unable to find matching template in project for name: "${params.templateName}"`,
      );
    }

    logger.info(
      `Initialised dynamic datasource from template: "${params.templateName}"`,
    );

    const dsObj = {
      ...template,
      startBlock: params.startBlock,
    } as SubqlProjectDs;
    delete dsObj.name;
    try {
      if (isCustomCosmosDs(dsObj)) {
        dsObj.processor.options = {
          ...dsObj.processor.options,
          ...params.args,
        };
        await this.dsProcessorService.validateCustomDs([dsObj]);
      } else if (isRuntimeCosmosDs(dsObj)) {
        // XXX add any modifications to the ds here
      }

      return dsObj;
    } catch (e) {
      throw new Error(`Unable to create dynamic datasource.\n ${e.message}`);
    }
  }
}
