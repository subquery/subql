// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {ConnectionPoolService} from '../connectionPool.service';
import {ConnectionPoolStateManager} from '../connectionPoolState.manager';
import {InMemoryCacheService} from '../inMemoryCache.service';
import {MonitorService} from '../monitor.service';
import {SandboxService} from '../sandbox.service';
import {WorkerInMemoryCacheService} from './worker.cache.service';
import {WorkerConnectionPoolStateManager} from './worker.connectionPoolState.manager';
import {WorkerMonitorService} from './worker.monitor.service';

@Module({
  providers: [
    ConnectionPoolService,
    SandboxService,
    {
      provide: ConnectionPoolStateManager,
      useFactory: () => new WorkerConnectionPoolStateManager((global as any).host),
    },
    {
      provide: MonitorService,
      useFactory: () => new WorkerMonitorService((global as any).host),
    },
    {
      provide: InMemoryCacheService,
      useFactory: () => new WorkerInMemoryCacheService((global as any).host),
    },
  ],
  exports: [ConnectionPoolService, SandboxService, MonitorService, InMemoryCacheService],
})
export class WorkerCoreModule {}
