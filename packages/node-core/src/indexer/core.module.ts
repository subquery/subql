// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {AdminController, AdminListener} from '../admin/admin.controller';
import {IndexingBenchmarkService, PoiBenchmarkService} from './benchmark.service';
import {ConnectionPoolService} from './connectionPool.service';
import {ConnectionPoolStateManager} from './connectionPoolState.manager';
import {InMemoryCacheService} from './inMemoryCache.service';
import {MonitorService} from './monitor.service';
import {PoiService, PoiSyncService} from './poi';
import {SandboxService} from './sandbox.service';
import {StoreService} from './store.service';
import {StoreCacheService} from './storeCache';

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
    StoreCacheService,
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
    StoreCacheService,
    InMemoryCacheService,
  ],
})
export class CoreModule {}
