// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { SubqlStellarDataSource } from '@subql/common-stellar';
import {
  MmrService,
  NodeConfig,
  StoreService,
  ForceCleanService,
  BaseReindexService,
} from '@subql/node-core';
import { BlockWrapper } from '@subql/types-stellar';
import { Sequelize } from '@subql/x-sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';

@Injectable()
export class ReindexService extends BaseReindexService<
  SubqueryProject,
  SubqlStellarDataSource,
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
    SubqlStellarDataSource[]
  > {
    return this.project.dataSources;
  }
}
