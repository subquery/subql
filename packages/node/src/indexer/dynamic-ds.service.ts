// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { isCustomDs, isRuntimeDs } from '@subql/common-substrate';
import {
  DatasourceParams,
  DynamicDsService as BaseDynamicDsService,
} from '@subql/node-core';
import {
  SubqueryProject,
  SubstrateProjectDs,
} from '../configure/SubqueryProject';
import { DsProcessorService } from './ds-processor.service';

@Injectable()
export class DynamicDsService extends BaseDynamicDsService<
  SubstrateProjectDs,
  SubqueryProject
> {
  constructor(
    private readonly dsProcessorService: DsProcessorService,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(project);
  }

  protected async getDatasource(
    params: DatasourceParams,
  ): Promise<SubstrateProjectDs> {
    const dsObj = this.getTemplate<SubstrateProjectDs>(
      params.templateName,
      params.startBlock,
    );

    try {
      if (isCustomDs(dsObj)) {
        dsObj.processor.options = {
          ...dsObj.processor.options,
          ...params.args,
        };
        await this.dsProcessorService.validateCustomDs([dsObj]);
      } else if (isRuntimeDs(dsObj)) {
        // XXX add any modifications to the ds here
      }

      return dsObj;
    } catch (e) {
      throw new Error(
        `Unable to create dynamic datasource.\n ${(e as any).message}`,
      );
    }
  }
}
