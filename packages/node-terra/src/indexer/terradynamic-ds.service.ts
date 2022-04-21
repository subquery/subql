// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import {
  isCustomTerraDs,
  isRuntimeTerraDs,
  TerraRuntimeDataSourceBase,
} from '@subql/common-terra';
import { SubqlTerraHandlerKind, SubqlTerraMapping } from '@subql/types-terra';
import { plainToClass } from 'class-transformer';
import { Transaction } from 'sequelize/types';
import {
  SubqlTerraProjectDs,
  SubqueryTerraProject,
} from '../configure/terraproject.model';
import { getLogger } from '../utils/logger';
import { MetadataRepo } from './entities/Metadata.entity';
import { TerraDsProcessorService } from './terrads-processor.service';

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
    private readonly dsProcessorService: TerraDsProcessorService,
    private readonly project: SubqueryTerraProject,
  ) {}

  init(metaDataRepo: MetadataRepo): void {
    this.metaDataRepo = metaDataRepo;
  }

  private _datasources: SubqlTerraProjectDs[];

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

  async getDynamicDatasources(): Promise<SubqlTerraProjectDs[]> {
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
  ): Promise<SubqlTerraProjectDs> {
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
    } as SubqlTerraProjectDs;
    delete dsObj.name;
    try {
      if (isCustomTerraDs(dsObj)) {
        dsObj.processor.options = {
          ...dsObj.processor.options,
          ...params.args,
        };
        await this.dsProcessorService.validateCustomDs([dsObj]);
      } else if (isRuntimeTerraDs(dsObj)) {
        dsObj.mapping.handlers = dsObj.mapping.handlers.map((handler) => {
          switch (handler.kind) {
            case SubqlTerraHandlerKind.Message:
              handler.filter = {
                ...handler.filter,
                ...params.args,
              };
              break;
            case SubqlTerraHandlerKind.Event:
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
      return dsObj;
    } catch (e) {
      throw new Error(`Unable to create dynamic datasource.\n ${e.message}`);
    }
  }
}
