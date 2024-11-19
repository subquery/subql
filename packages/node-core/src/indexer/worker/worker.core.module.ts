// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {ConnectionPoolService} from '../connectionPool.service';
import {ConnectionPoolStateManager} from '../connectionPoolState.manager';
import {DynamicDsService} from '../dynamic-ds.service';
import {InMemoryCacheService} from '../inMemoryCache.service';
import {MonitorService} from '../monitor.service';
import {SandboxService} from '../sandbox.service';
import {UnfinalizedBlocksService} from '../unfinalizedBlocks.service';
import {WorkerInMemoryCacheService} from './worker.cache.service';
import {WorkerConnectionPoolStateManager} from './worker.connectionPoolState.manager';
import {WorkerDynamicDsService} from './worker.dynamic-ds.service';
import {WorkerMonitorService} from './worker.monitor.service';
import {WorkerUnfinalizedBlocksService} from './worker.unfinalizedBlocks.service';

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
    {
      provide: 'IUnfinalizedBlocksService',
      useFactory: () => new WorkerUnfinalizedBlocksService((global as any).host),
    },
    {
      provide: DynamicDsService,
      useFactory: () => new WorkerDynamicDsService((global as any).host),
    },
  ],
  exports: [
    ConnectionPoolService,
    SandboxService,
    MonitorService,
    InMemoryCacheService,
    'IUnfinalizedBlocksService',
    DynamicDsService,
  ],
})
export class WorkerCoreModule {}
