// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import path from 'path';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreService,
  IProjectService,
  WorkerBlockDispatcher,
  ConnectionPoolStateManager,
  IProjectUpgradeService,
  PoiSyncService,
  InMemoryCacheService,
  createIndexerWorker as createIndexerWorkerCore,
  MonitorServiceInterface,
  IStoreModelProvider,
  UnfinalizedBlocksService,
  DynamicDsService,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { ApiPromiseConnection } from '../apiPromise.connection';
import { RuntimeService } from '../runtime/runtimeService';
import { BlockContent, LightBlockContent } from '../types';
import { IIndexerWorker } from '../worker/worker';
import { FetchBlockResponse } from '../worker/worker.service';

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

@Injectable()
export class WorkerBlockDispatcherService
  extends WorkerBlockDispatcher<
    SubstrateDatasource,
    IndexerWorker,
    BlockContent | LightBlockContent
  >
  implements OnApplicationShutdown {
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
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService<SubstrateDatasource>,
    unfinalizedBlocksService: UnfinalizedBlocksService<
      BlockContent | LightBlockContent
    >,
    connectionPoolState: ConnectionPoolStateManager<ApiPromiseConnection>,
    monitorService?: MonitorServiceInterface,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgadeService,
      storeService,
      storeModelProvider,
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

  async init(
    onDynamicDsCreated: (height: number) => void,
    runtimeService?: RuntimeService,
  ): Promise<void> {
    await super.init(onDynamicDsCreated);
    // Sync workers runtime from main
    if (runtimeService) this._runtimeService = runtimeService;
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
  ): Promise<FetchBlockResponse> {
    // get SpecVersion from main runtime service
    const { blockSpecVersion, syncedDictionary } =
      await this.runtimeService.getSpecVersion(height);
    // if main runtime specVersion has been updated, then sync with all workers specVersion map, and lastFinalizedBlock
    if (syncedDictionary) {
      this.syncWorkerRuntimes();
    }

    // const start = new Date();
    return worker.fetchBlock(height, blockSpecVersion);
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
