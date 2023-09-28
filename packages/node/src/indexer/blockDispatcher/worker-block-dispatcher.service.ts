// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  Worker,
  SmartBatchService,
  StoreService,
  PoiService,
  StoreCacheService,
  IProjectService,
  IDynamicDsService,
  WorkerBlockDispatcher,
  IUnfinalizedBlocksService,
  ConnectionPoolStateManager,
  connectionPoolStateHostFunctions,
  IProjectUpgradeService,
  DefaultWorkerFunctions,
  baseWorkerFunctions,
  storeHostFunctions,
  dynamicDsHostFunctions,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { Store } from '@subql/types-core';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { ApiPromiseConnection } from '../apiPromise.connection';
import { DynamicDsService } from '../dynamic-ds.service';
import { RuntimeService } from '../runtime/runtimeService';
import { BlockContent } from '../types';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { IIndexerWorker, IInitIndexerWorker } from '../worker/worker';

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

async function createIndexerWorker(
  store: Store,
  dynamicDsService: IDynamicDsService<SubstrateDatasource>,
  unfinalizedBlocksService: IUnfinalizedBlocksService<BlockContent>,
  connectionPoolState: ConnectionPoolStateManager<ApiPromiseConnection>,
  root: string,
  startHeight: number,
): Promise<IndexerWorker> {
  const indexerWorker = Worker.create<
    IInitIndexerWorker,
    DefaultWorkerFunctions<ApiPromiseConnection, SubstrateDatasource>
  >(
    path.resolve(__dirname, '../../../dist/indexer/worker/worker.js'),
    [
      ...baseWorkerFunctions,
      'initWorker',
      'syncRuntimeService',
      'getSpecFromMap',
    ],
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
  extends WorkerBlockDispatcher<SubstrateDatasource, IndexerWorker>
  implements OnApplicationShutdown
{
  private runtimeService: RuntimeService;

  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<SubstrateDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgadeService: IProjectUpgradeService,
    smartBatchService: SmartBatchService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiService: PoiService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksSevice: UnfinalizedBlocksService,
    connectionPoolState: ConnectionPoolStateManager<ApiPromiseConnection>,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgadeService,
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

  async init(
    onDynamicDsCreated: (height: number) => Promise<void>,
    runtimeService?: RuntimeService,
  ): Promise<void> {
    await super.init(onDynamicDsCreated);
    // Sync workers runtime from main
    this.runtimeService = runtimeService;
    this.syncWorkerRuntimes();
  }

  syncWorkerRuntimes(): void {
    this.workers.map((w) =>
      w.syncRuntimeService(
        this.runtimeService.specVersionMap,
        this.runtimeService.latestFinalizedHeight,
      ),
    );
  }

  protected async fetchBlock(
    worker: IndexerWorker,
    height: number,
  ): Promise<void> {
    // get SpecVersion from main runtime service
    const { blockSpecVersion, syncedDictionary } =
      await this.runtimeService.getSpecVersion(height);
    // if main runtime specVersion has been updated, then sync with all workers specVersion map, and lastFinalizedBlock
    if (syncedDictionary) {
      this.syncWorkerRuntimes();
    }

    // const start = new Date();
    await worker.fetchBlock(height, blockSpecVersion);
    // const end = new Date();

    // const waitTime = end.getTime() - start.getTime();
    // if (waitTime > 1000) {
    //   logger.info(
    //     `Waiting to fetch block ${height}: ${chalk.red(`${waitTime}ms`)}`,
    //   );
    // } else if (waitTime > 200) {
    //   logger.info(
    //     `Waiting to fetch block ${height}: ${chalk.yellow(`${waitTime}ms`)}`,
    //   );
    // }
  }
}
