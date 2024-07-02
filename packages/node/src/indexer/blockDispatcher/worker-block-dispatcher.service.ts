// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  getLogger,
  NodeConfig,
  StoreService,
  PoiSyncService,
  StoreCacheService,
  IProjectService,
  WorkerBlockDispatcher,
  IProjectUpgradeService,
  ConnectionPoolStateManager,
  createIndexerWorker,
  InMemoryCacheService,
  MonitorServiceInterface,
} from '@subql/node-core';
import { StellarBlockWrapper, SubqlDatasource } from '@subql/types-stellar';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { StellarApiConnection } from '../../stellar/api.connection';
import { StellarBlockWrapped } from '../../stellar/block.stellar';
import { DynamicDsService } from '../dynamic-ds.service';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { IIndexerWorker } from '../worker/worker';

const logger = getLogger('WorkerBlockDispatcherService');

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

@Injectable()
export class WorkerBlockDispatcherService
  extends WorkerBlockDispatcher<
    SubqlDatasource,
    IndexerWorker,
    StellarBlockWrapper
  >
  implements OnApplicationShutdown
{
  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<SubqlDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    cacheService: InMemoryCacheService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksSevice: UnfinalizedBlocksService,
    connectionPoolState: ConnectionPoolStateManager<StellarApiConnection>,
    monitorService?: MonitorServiceInterface,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgradeService,
      storeService,
      storeCacheService,
      poiSyncService,
      project,
      () =>
        createIndexerWorker<
          IIndexerWorker,
          StellarApiConnection,
          StellarBlockWrapped,
          SubqlDatasource
        >(
          path.resolve(__dirname, '../../../dist/indexer/worker/worker.js'),
          [],
          storeService.getStore(),
          cacheService.getCache(),
          dynamicDsService,
          unfinalizedBlocksSevice,
          connectionPoolState,
          project.root,
          projectService.startHeight,
          monitorService,
        ),
      monitorService,
    );
  }

  protected async fetchBlock(
    worker: IndexerWorker,
    height: number,
  ): Promise<void> {
    const start = new Date();
    await worker.fetchBlock(height, null);
    const end = new Date();
  }
}
