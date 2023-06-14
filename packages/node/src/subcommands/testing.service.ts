// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import {
  NodeConfig,
  StoreService,
  TestingService as BaseTestingService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { ApiAt, BlockContent } from '../indexer/types';

@Injectable()
export class TestingService extends BaseTestingService<
  ApiPromise,
  ApiAt,
  BlockContent,
  SubqlProjectDs
> {
  constructor(
    sequelize: Sequelize,
    nodeConfig: NodeConfig,
    storeService: StoreService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    apiService: ApiService,
    indexerManager: IndexerManager,
  ) {
    super(
      sequelize,
      nodeConfig,
      storeService,
      project,
      apiService,
      indexerManager,
    );
  }

  async indexBlock(block: BlockContent, handler: string): Promise<void> {
    const runtimeVersion =
      await this.apiService.unsafeApi.rpc.state.getRuntimeVersion(
        block.block.block.header.hash,
      );

    await this.indexerManager.indexBlock(
      block,
      this.getDsWithHandler(handler),
      runtimeVersion,
    );
  }
}
