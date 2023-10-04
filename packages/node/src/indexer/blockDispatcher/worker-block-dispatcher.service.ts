// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  getLogger,
  NodeConfig,
  Worker,
  SmartBatchService,
  StoreService,
  PoiService,
  StoreCacheService,
  IProjectService,
  IDynamicDsService,
  HostStore,
  HostDynamicDS,
  WorkerBlockDispatcher,
  IUnfinalizedBlocksService,
  HostConnectionPoolState,
  ConnectionPoolStateManager,
  connectionPoolStateHostFunctions,
  baseWorkerFunctions,
  storeHostFunctions,
  dynamicDsHostFunctions,
  IProjectUpgradeService,
  HostUnfinalizedBlocks,
} from '@subql/node-core';
import { Store } from '@subql/types-core';
import {
  StellarProjectDs,
  SubqueryProject,
} from '../../configure/SubqueryProject';
import { StellarApiConnection } from '../../stellar/api.connection';
import { StellarBlockWrapped } from '../../stellar/block.stellar';
import { DynamicDsService } from '../dynamic-ds.service';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { IIndexerWorker, IInitIndexerWorker } from '../worker/worker';

const logger = getLogger('WorkerBlockDispatcherService');

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

async function createIndexerWorker(
  store: Store,
  dynamicDsService: IDynamicDsService<StellarProjectDs>,
  unfinalizedBlocksService: IUnfinalizedBlocksService<StellarBlockWrapped>,
  connectionPoolState: ConnectionPoolStateManager<StellarApiConnection>,
  root: string,
  startHeight: number,
): Promise<IndexerWorker> {
  const indexerWorker = Worker.create<
    IInitIndexerWorker,
    HostDynamicDS<StellarProjectDs> & HostStore & HostUnfinalizedBlocks
  >(
    path.resolve(__dirname, '../../../dist/indexer/worker/worker.js'),
    [...baseWorkerFunctions, 'initWorker'],
    {
      ...storeHostFunctions(store),
      ...dynamicDsHostFunctions(dynamicDsService),
      unfinalizedBlocksProcess:
        unfinalizedBlocksService.processUnfinalizedBlockHeader.bind(
          unfinalizedBlocksService,
        ),
      ...connectionPoolStateHostFunctions(connectionPoolState),
    },
    root,
  );

  await indexerWorker.initWorker(startHeight);

  return indexerWorker;
}

@Injectable()
export class WorkerBlockDispatcherService
  extends WorkerBlockDispatcher<StellarProjectDs, IndexerWorker>
  implements OnApplicationShutdown
{
  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<StellarProjectDs>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    smartBatchService: SmartBatchService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiService: PoiService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksSevice: UnfinalizedBlocksService,
    connectionPoolState: ConnectionPoolStateManager<StellarApiConnection>,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgradeService,
      smartBatchService,
      storeService,
      storeCacheService,
      poiService,
      project,
      dynamicDsService,
      () =>
        createIndexerWorker(
          storeService.getStore(),
          dynamicDsService,
          unfinalizedBlocksSevice,
          connectionPoolState,
          project.root,
          projectService.startHeight,
        ),
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
