// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import {
    CustomDataSourceV0_2_0Impl,
  isCustomDs,
  isRuntimeDs,
  RuntimeDataSourceV0_2_0Impl,
} from '@subql/common';
import { SubqlDatasource } from '@subql/types';
import { plainToClass } from 'class-transformer';
import { Transaction } from 'sequelize/types';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { getLogger } from '../utils/logger';
import { DsProcessorService } from './ds-processor.service';
import { StoreService } from './store.service';

const logger = getLogger('dynamic-ds');

const METADATA_KEY = 'dynamicDatasources';

interface DatasourceParams {
  templateName: string;
  args?: Record<string, unknown>;
  startBlock: number;
}

@Injectable()
export class DynamicDsService {
  constructor(
    private readonly storeService: StoreService,
    private readonly dsProcessorService: DsProcessorService,
    private readonly project: SubqueryProject,
  ) {}

  private _datasources: SubqlProjectDs[];

  async createDynamicDatasource(
    params: DatasourceParams,
    tx: Transaction,
  ): Promise<void> {
    try {
      const ds = await this.getDatasource(params);

      await this.saveDynamicDatasourceParams(params, tx);

      if (!this._datasources) this._datasources = [];
      this._datasources.push(ds);
    } catch (e) {
      logger.error(e.message);
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
        logger.error(`Unable to get dynamic datasources:\n${e.message}`);
        process.exit(1);
      }
    }

    return this._datasources;
  }

  private async getDynamicDatasourceParams(): Promise<DatasourceParams[]> {
    const results = await this.storeService.getMetadata(METADATA_KEY);

    if (!results || typeof results !== 'string') {
      return [];
    }

    return JSON.parse(results);
  }

  private async saveDynamicDatasourceParams(
    dsParams: DatasourceParams,
    tx: Transaction,
  ): Promise<void> {
    const existing = await this.getDynamicDatasourceParams();

    await this.storeService.setMetadata(
      METADATA_KEY,
      JSON.stringify([...existing, dsParams]),
      { transaction: tx },
    );
  }

  private async getDatasource(
    params: DatasourceParams,
  ): Promise<SubqlProjectDs> {
    const template = this.project.templates.find(
      (t) => t.name === params.templateName,
    );

    if (!template) {
      throw new Error(
        `Unable to find matching template in project for name: "${params.templateName}"`,
      );
    }

    logger.info(
      `Creating new datasource from template: "${params.templateName}"`,
    );

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

        const customDs: CustomDataSourceV0_2_0Impl = plainToClass(
          CustomDataSourceV0_2_0Impl,
          dsObj,
        );
        customDs.validate();
      } else if (isRuntimeDs(dsObj)) {
        // XXX add any modifications to the ds here

        const runtimeDs = plainToClass(RuntimeDataSourceV0_2_0Impl, dsObj);
        runtimeDs.validate();
      }

      return dsObj;
    } catch (e) {
      throw new Error(`Unable to create dynamic datasource.\n ${e.message}`);
    }
  }
}
