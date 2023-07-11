// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import {
  TestRunner as BaseTestRunner,
  NodeConfig,
  StoreService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { SubqlProjectDs } from '../configure/SubqueryProject';
import { ApiService } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { ApiAt, BlockContent } from '../indexer/types';

@Injectable()
export class TestRunner extends BaseTestRunner<
  ApiPromise,
  ApiAt,
  BlockContent,
  SubqlProjectDs
> {
  constructor(
    apiService: ApiService,
    storeService: StoreService,
    sequelize: Sequelize,
    nodeConfig: NodeConfig,
    indexerManager: IndexerManager,
  ) {
    super(apiService, storeService, sequelize, nodeConfig, indexerManager);
  }
}
