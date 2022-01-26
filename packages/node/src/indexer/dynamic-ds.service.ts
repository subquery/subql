// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import {
  CustomDataSourceV0_2_0Impl,
  isCustomDs,
  isRuntimeDs,
  RuntimeDataSourceV0_2_0Impl,
} from '@subql/common';
import { SubqlDatasource, SubqlDatasourceKind } from '@subql/types';
import { plainToClass } from 'class-transformer';
import yaml from 'js-yaml';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { Transaction } from 'sequelize/types';
import { getLogger } from '../utils/logger';
import { DsProcessorService } from './ds-processor.service';
import { StoreService } from './store.service';

const logger = getLogger('dynamic-ds');

const METADATA_KEY = 'dynamicDatasources';

function replacer(key: string, value: any): any {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const key of value.keys()) {
      obj[key] = value.get(key);
    }

    return obj;
  } else {
    return value;
  }
}

@Injectable()
export class DynamicDsService {
  constructor(
    private readonly storeService: StoreService,
    private readonly dsProcessorService: DsProcessorService,
    private readonly project: SubqueryProject,
  ) {}

  async createDynamicDatasource(
    templateName: string,
    args: Record<string, unknown>,
    currentBlock: number,
    tx: Transaction,
  ): Promise<void> {

    const template = this.project.templates.find(
      (t) => t.name === templateName,
    );

    if (!template) {
      logger.error(
        `Unable to find matching template in project for name: "${templateName}"`,
      );
      process.exit(1);
    }

    logger.info(`Creating new datasource from template: "${templateName}"`);

    const ds: SubqlDatasource = { ...template, startBlock: currentBlock };
    try {
      if (isCustomDs(ds)) {
        ds.processor.options = { ...ds.processor.options, ...args };
        await this.dsProcessorService.validateCustomDs([ds]);
      } else if (isRuntimeDs(ds)) {
        // XXX add any modifications to the ds here

        const runtimeDs = plainToClass(RuntimeDataSourceV0_2_0Impl, ds);
        runtimeDs.validate();
      }
    } catch (e) {
      logger.error(`Unable to create dynamic datasource.\n ${e.message}`);
      process.exit(1);
    }

    await this.saveDynamicDatasource(ds, tx);
  }

  async getDynamicDatasources(): Promise<SubqlProjectDs[]> {
    const results = await this.storeService.getMetadata(METADATA_KEY);

    if (!results) {
      return [];
    }

    const jsonDs = yaml.load(results as unknown as string) as any[];

    // Convert from objects to classes, this is needed for Map type in custom ds assets
    return jsonDs.map((ds) => {
      if (isRuntimeDs(ds)) {
        return plainToClass(RuntimeDataSourceV0_2_0Impl, ds);
      } else if (ds.kind !== SubqlDatasourceKind.Runtime) {
        return plainToClass(CustomDataSourceV0_2_0Impl, ds);
      }

      logger.warn(`Unknown datasource kind (${ds.kind}), using plain object`);
      return ds;
    });
  }

  private async saveDynamicDatasource(
    ds: SubqlDatasource,
    tx: Transaction,
  ): Promise<void> {
    const existing = await this.getDynamicDatasources();

    // Need to convert Map objects to records
    const dsObj = JSON.parse(JSON.stringify(ds, replacer));

    await this.storeService.setMetadata(
      METADATA_KEY,
      yaml.dump([...existing, dsObj]),
      { transaction: tx },
    );
  }
}
