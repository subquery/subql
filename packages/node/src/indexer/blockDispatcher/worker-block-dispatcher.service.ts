// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreService,
  StoreCacheService,
  IProjectService,
  WorkerBlockDispatcher,
  ConnectionPoolStateManager,
  IProjectUpgradeService,
  PoiSyncService,
  InMemoryCacheService,
  createIndexerWorker,
  MonitorServiceInterface,
} from '@subql/node-core';
import { EthereumBlock } from '@subql/types-ethereum';
import {
  EthereumProjectDs,
  SubqueryProject,
} from '../../configure/SubqueryProject';
import { EthereumApiConnection } from '../../ethereum/api.connection';
import { DynamicDsService } from '../dynamic-ds.service';
import { BlockContent } from '../types';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { IIndexerWorker } from '../worker/worker';

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

@Injectable()
export class WorkerBlockDispatcherService
  extends WorkerBlockDispatcher<EthereumProjectDs, IndexerWorker, EthereumBlock>
  implements OnApplicationShutdown
{
  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<EthereumProjectDs>,
    @Inject('IProjectUpgradeService')
    projectUpgadeService: IProjectUpgradeService,
    cacheService: InMemoryCacheService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksSevice: UnfinalizedBlocksService,
    connectionPoolState: ConnectionPoolStateManager<EthereumApiConnection>,
    monitorService?: MonitorServiceInterface,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgadeService,
      storeService,
      storeCacheService,
      poiSyncService,
      project,
      () =>
        createIndexerWorker<
          IIndexerWorker,
          EthereumApiConnection,
          BlockContent,
          EthereumProjectDs
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
    await worker.fetchBlock(height, 0 /* Unused with ethereum*/);
  }
}
