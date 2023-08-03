// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { SubqlSorobanDataSource } from '@subql/common-soroban';
import {
  MmrService,
  NodeConfig,
  StoreService,
  ForceCleanService,
  BaseReindexService,
} from '@subql/node-core';
import { BlockWrapper } from '@subql/types-soroban';
import { Sequelize } from '@subql/x-sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';

@Injectable()
export class ReindexService extends BaseReindexService<
  SubqueryProject,
  SubqlSorobanDataSource,
  BlockWrapper
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

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getStartBlockDatasources(): Promise<
    SubqlSorobanDataSource[]
  > {
    return this.project.dataSources;
  }
}
