// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {Sequelize} from '@subql/x-sequelize';
import {AdminController, AdminListener} from '../admin/admin.controller';
import {NodeConfig} from '../configure';
import {IndexingBenchmarkService, PoiBenchmarkService} from './benchmark.service';
import {ConnectionPoolService} from './connectionPool.service';
import {ConnectionPoolStateManager} from './connectionPoolState.manager';
import {InMemoryCacheService} from './inMemoryCache.service';
import {MonitorService} from './monitor.service';
import {PoiService, PoiSyncService} from './poi';
import {SandboxService} from './sandbox.service';
import {StoreService} from './store.service';
import {PlainStoreModelService, StoreCacheService} from './storeCache';
import {BaseStoreModelService} from './storeCache/baseStoreModel.service';

@Module({
  providers: [
    InMemoryCacheService,
    SandboxService,
    ConnectionPoolStateManager,
    ConnectionPoolService,
    IndexingBenchmarkService,
    PoiBenchmarkService,
    MonitorService,
    PoiService,
    PoiSyncService,
    StoreService,
    {
      provide: BaseStoreModelService,
      useFactory: (
        storeService: StoreService,
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
        schedulerRegistry: SchedulerRegistry,
        sequelize: Sequelize
      ): BaseStoreModelService<any> => {
        return nodeConfig.cacheDisable
          ? new PlainStoreModelService(sequelize, nodeConfig, storeService)
          : new StoreCacheService(sequelize, nodeConfig, eventEmitter, schedulerRegistry);
      },
      inject: [Sequelize, NodeConfig, EventEmitter2, SchedulerRegistry, StoreService],
    },
    AdminListener,
  ],
  controllers: [AdminController],
  exports: [
    ConnectionPoolService,
    ConnectionPoolStateManager,
    SandboxService,
    MonitorService,
    PoiService,
    PoiSyncService,
    StoreService,
    BaseStoreModelService,
    InMemoryCacheService,
  ],
})
export class CoreModule {}
