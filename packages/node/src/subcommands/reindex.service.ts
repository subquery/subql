// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { SubqlEthereumDataSource } from '@subql/common-ethereum';
import {
  MmrService,
  NodeConfig,
  StoreService,
  ForceCleanService,
  BaseReindexService,
} from '@subql/node-core';
import { BlockWrapper } from '@subql/types-ethereum';
import { Sequelize } from '@subql/x-sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';

@Injectable()
export class ReindexService extends BaseReindexService<
  SubqueryProject,
  SubqlEthereumDataSource,
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
    SubqlEthereumDataSource[]
  > {
    return this.project.dataSources;
  }
}
