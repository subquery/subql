// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { isCustomCosmosDs, isRuntimeCosmosDs } from '@subql/common-cosmos';
import {
  getLogger,
  DatasourceParams,
  DynamicDsService as BaseDynamicDsService,
} from '@subql/node-core';
import { cloneDeep } from 'lodash';
import { CosmosProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { DsProcessorService } from './ds-processor.service';

const logger = getLogger('DynamicDsService');

@Injectable()
export class DynamicDsService extends BaseDynamicDsService<CosmosProjectDs> {
  constructor(
    private readonly dsProcessorService: DsProcessorService,
    @Inject('ISubqueryProject') private readonly project: SubqueryProject,
  ) {
    super();
  }

  protected async getDatasource(
    params: DatasourceParams,
  ): Promise<CosmosProjectDs> {
    const { name, ...template } = cloneDeep(
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
    } as CosmosProjectDs;
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
