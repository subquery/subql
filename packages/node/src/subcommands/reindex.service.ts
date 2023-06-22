// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  MmrService,
  NodeConfig,
  StoreService,
  ForceCleanService,
  BaseReindexService,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { Sequelize } from '@subql/x-sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { BlockContent } from '../indexer/types';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';

@Injectable()
export class ReindexService extends BaseReindexService<
  SubqueryProject,
  SubstrateDatasource,
  BlockContent
> {
  constructor(
    sequelize: Sequelize,
    nodeConfig: NodeConfig,
    storeService: StoreService,
    mmrService: MmrService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    forceCleanService: ForceCleanService,
    unfinalizedBlocksService: UnfinalizedBlocksService,
    dynamicDsService: DynamicDsService,
  ) {
    super(
      sequelize,
      nodeConfig,
      storeService,
      mmrService,
      project,
      forceCleanService,
      unfinalizedBlocksService,
      dynamicDsService,
    );
  }

  protected async getStartBlockDatasources(): Promise<SubstrateDatasource[]> {
    const specName = await this.getMetadataSpecName();
    return this.project.dataSources.filter(
      (ds) => !ds.filter?.specName || ds.filter.specName === specName,
    );
  }
}
