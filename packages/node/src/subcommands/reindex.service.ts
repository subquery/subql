// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
import { filterDataSourcesBySpecName } from '../utils/project';

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
    return filterDataSourcesBySpecName(
      this.project.dataSources,
      await this.getMetadataSpecName(),
    );
  }
}

