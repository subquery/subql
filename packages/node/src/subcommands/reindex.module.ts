// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ForceCleanService,
  ReindexService,
  StoreService,
  PoiService,
  ConnectionPoolService,
  NodeConfig,
  ConnectionPoolStateManager,
  storeModelFactory,
  DsProcessorService,
  UnfinalizedBlocksService,
  DynamicDsService,
  MultiChainRewindService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { BlockchainService } from '../blockchain.service';

import { ApiService } from '../indexer/api.service';
import { RuntimeService } from '../indexer/runtime/runtimeService';

@Module({
  providers: [
    {
      provide: 'IStoreModelProvider',
      useFactory: storeModelFactory,
      inject: [NodeConfig, EventEmitter2, Sequelize],
    },
    StoreService,
    ReindexService,
    PoiService,
    ForceCleanService,
    {
      provide: 'UnfinalizedBlocksService',
      useClass: UnfinalizedBlocksService,
    },
    {
      provide: 'DynamicDsService',
      useClass: DynamicDsService,
    },
    DsProcessorService,
    ConnectionPoolStateManager,
    ConnectionPoolService,
    {
      // Used to work with DI for unfinalizedBlocksService but not used with reindex
      provide: 'APIService',
      useFactory: ApiService.init,
      inject: [
        'ISubqueryProject',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    {
      provide: 'RuntimeService',
      useClass: RuntimeService,
    },
    {
      provide: 'IBlockchainService',
      useClass: BlockchainService,
    },
    MultiChainRewindService,
  ],
  controllers: [],
})
export class ReindexFeatureModule {}
