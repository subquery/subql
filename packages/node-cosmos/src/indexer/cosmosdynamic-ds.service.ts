// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import {
  isCustomCosmosDs,
  isRuntimeCosmosDs,
  CosmosRuntimeDataSourceBase,
  CosmosRuntimeDataSourceV0_3_0Impl,
} from '@subql/common-cosmos';
import {
  SubqlCosmosHandlerKind,
  SubqlCosmosMapping,
} from '@subql/types-cosmos';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Transaction } from 'sequelize/types';
import {
  SubqlCosmosProjectDs,
  SubqueryCosmosProject,
} from '../configure/cosmosproject.model';
import { getLogger } from '../utils/logger';
import { CosmosDsProcessorService } from './cosmosds-processor.service';
import { MetadataRepo } from './entities/Metadata.entity';

const logger = getLogger('dynamic-ds');

const METADATA_KEY = 'dynamicDatasources';

interface DatasourceParams {
  templateName: string;
  args?: Record<string, unknown>;
  startBlock: number;
}

@Injectable()
export class DynamicDsService {
  private metaDataRepo: MetadataRepo;

  constructor(
    private readonly dsProcessorService: CosmosDsProcessorService,
    private readonly project: SubqueryCosmosProject,
  ) {}

  init(metaDataRepo: MetadataRepo): void {
    this.metaDataRepo = metaDataRepo;
  }

  private _datasources: SubqlCosmosProjectDs[];

  async createDynamicDatasource(
    params: DatasourceParams,
    tx: Transaction,
  ): Promise<void> {
    try {
      const ds = await this.getDatasource(params);

      await this.saveDynamicDatasourceParams(params, tx);

      logger.info(
        `Created new dynamic datasource from template: "${params.templateName}"`,
      );

      if (!this._datasources) this._datasources = [];
      this._datasources.push(ds);
    } catch (e) {
      logger.error(e.message);
      process.exit(1);
    }
  }

  async getDynamicDatasources(): Promise<SubqlCosmosProjectDs[]> {
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
    assert(this.metaDataRepo, `Model _metadata does not exist`);
    const record = await this.metaDataRepo.findByPk(METADATA_KEY);
    const results = record?.value;

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

    assert(this.metaDataRepo, `Model _metadata does not exist`);
    await this.metaDataRepo.upsert(
      { key: METADATA_KEY, value: JSON.stringify([...existing, dsParams]) },
      { transaction: tx },
    );
  }

  private async getDatasource(
    params: DatasourceParams,
  ): Promise<SubqlCosmosProjectDs> {
    const template = this.project.templates.find(
      (t) => t.name === params.templateName,
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
    } as SubqlCosmosProjectDs;
    delete dsObj.name;
    try {
      if (isCustomCosmosDs(dsObj)) {
        dsObj.processor.options = {
          ...dsObj.processor.options,
          ...params.args,
        };
        await this.dsProcessorService.validateCustomDs([dsObj]);
      } else if (isRuntimeCosmosDs(dsObj)) {
        dsObj.mapping.handlers = dsObj.mapping.handlers.map((handler) => {
          switch (handler.kind) {
            case SubqlCosmosHandlerKind.Message:
              handler.filter = {
                ...handler.filter,
                ...params.args,
              };
              break;
            case SubqlCosmosHandlerKind.Event:
              handler.filter.messageFilter = {
                ...handler.filter.messageFilter,
                ...params.args,
              };
              break;
            default:
          }
          return handler;
        });
      }
      const ds: CosmosRuntimeDataSourceV0_3_0Impl = plainToClass(
        CosmosRuntimeDataSourceV0_3_0Impl,
        dsObj,
      );
      validateSync(ds);
      return dsObj;
    } catch (e) {
      throw new Error(`Unable to create dynamic datasource.\n ${e.message}`);
    }
  }
}
