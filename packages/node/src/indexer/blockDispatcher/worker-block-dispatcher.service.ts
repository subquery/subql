// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
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
  createIndexerWorker as createIndexerWorkerCore,
  MonitorServiceInterface,
} from '@subql/node-core';
import { SubstrateBlock, SubstrateDatasource } from '@subql/types';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { ApiPromiseConnection } from '../apiPromise.connection';
import { DynamicDsService } from '../dynamic-ds.service';
import { RuntimeService } from '../runtime/runtimeService';
import { BlockContent } from '../types';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { IIndexerWorker } from '../worker/worker';

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

@Injectable()
export class WorkerBlockDispatcherService
  extends WorkerBlockDispatcher<
    SubstrateDatasource,
    IndexerWorker,
    SubstrateBlock
  >
  implements OnApplicationShutdown
{
  private _runtimeService?: RuntimeService;

  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<SubstrateDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgadeService: IProjectUpgradeService,
    cacheService: InMemoryCacheService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksService: UnfinalizedBlocksService,
    connectionPoolState: ConnectionPoolStateManager<ApiPromiseConnection>,
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
        createIndexerWorkerCore<
          IIndexerWorker,
          ApiPromiseConnection,
          BlockContent,
          SubstrateDatasource
        >(
          path.resolve(__dirname, '../../../dist/indexer/worker/worker.js'),
          ['syncRuntimeService', 'getSpecFromMap'],
          storeService.getStore(),
          cacheService.getCache(),
          dynamicDsService,
          unfinalizedBlocksService,
          connectionPoolState,
          project.root,
          projectService.startHeight,
          monitorService,
        ),
      monitorService,
    );
  }

  private get runtimeService(): RuntimeService {
    assert(this._runtimeService, 'RuntimeService not initialized');
    return this._runtimeService;
  }

  private set runtimeService(runtimeService: RuntimeService) {
    this._runtimeService = runtimeService;
  }

  async init(
    onDynamicDsCreated: (height: number) => void,
    runtimeService?: RuntimeService,
  ): Promise<void> {
    await super.init(onDynamicDsCreated);
    // Sync workers runtime from main
    if (runtimeService) this.runtimeService = runtimeService;
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
