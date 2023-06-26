// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
  HostStore,
  HostDynamicDS,
  WorkerBlockDispatcher,
  IUnfinalizedBlocksService,
  HostConnectionPoolState,
  ConnectionPoolStateManager,
} from '@subql/node-core';
import { Store, SubstrateDatasource } from '@subql/types';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { ApiPromiseConnection } from '../apiPromise.connection';
import { DynamicDsService } from '../dynamic-ds.service';
import { RuntimeService } from '../runtime/runtimeService';
import { BlockContent } from '../types';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { IIndexerWorker, IInitIndexerWorker } from '../worker/worker';
import { HostUnfinalizedBlocks } from '../worker/worker.unfinalizedBlocks.service';

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

async function createIndexerWorker(
  store: Store,
  dynamicDsService: IDynamicDsService<SubstrateDatasource>,
  unfinalizedBlocksService: IUnfinalizedBlocksService<BlockContent>,
  connectionPoolState: ConnectionPoolStateManager<ApiPromiseConnection>,
  root: string,
): Promise<IndexerWorker> {
  const indexerWorker = Worker.create<
    IInitIndexerWorker,
    HostDynamicDS<SubstrateDatasource> &
      HostStore &
      HostUnfinalizedBlocks &
      HostConnectionPoolState<ApiPromiseConnection>
  >(
    path.resolve(__dirname, '../../../dist/indexer/worker/worker.js'),
    [
      'initWorker',
      'processBlock',
      'fetchBlock',
      'numFetchedBlocks',
      'numFetchingBlocks',
      'getStatus',
      'syncRuntimeService',
      'getSpecFromMap',
      'getMemoryLeft',
      'waitForWorkerBatchSize',
    ],
    {
      storeGet: store.get.bind(store),
      storeGetByField: store.getByField.bind(store),
      storeGetOneByField: store.getOneByField.bind(store),
      storeSet: store.set.bind(store),
      storeBulkCreate: store.bulkCreate.bind(store),
      storeBulkUpdate: store.bulkUpdate.bind(store),
      storeRemove: store.remove.bind(store),
      storeBulkRemove: store.bulkRemove.bind(store),
      dynamicDsCreateDynamicDatasource:
        dynamicDsService.createDynamicDatasource.bind(dynamicDsService),
      dynamicDsGetDynamicDatasources:
        dynamicDsService.getDynamicDatasources.bind(dynamicDsService),
      unfinalizedBlocksProcess:
        unfinalizedBlocksService.processUnfinalizedBlockHeader.bind(
          unfinalizedBlocksService,
        ),
      hostAddToConnections:
        connectionPoolState.addToConnections.bind(connectionPoolState),
      hostGetNextConnectedApiIndex:
        connectionPoolState.getNextConnectedApiIndex.bind(connectionPoolState),
      hostGetFieldFromConnectionPoolItem:
        connectionPoolState.getFieldValue.bind(connectionPoolState),
      hostSetFieldInConnectionPoolItem:
        connectionPoolState.setFieldValue.bind(connectionPoolState),
      hostSetTimeoutIdInConnectionPoolItem:
        connectionPoolState.setTimeout.bind(connectionPoolState),
      hostClearTimeoutIdInConnectionPoolItem:
        connectionPoolState.clearTimeout.bind(connectionPoolState),
      hostGetSuspendedIndices:
        connectionPoolState.getSuspendedIndices.bind(connectionPoolState),
      hostDeleteFromPool:
        connectionPoolState.deleteFromPool.bind(connectionPoolState),
      hostHandleApiError:
        connectionPoolState.handleApiError.bind(connectionPoolState),
      hostHandleApiSuccess:
        connectionPoolState.handleApiSuccess.bind(connectionPoolState),
      hostGetDisconnectedIndices:
        connectionPoolState.getDisconnectedIndices.bind(connectionPoolState),
      hostShutdownPoolState:
        connectionPoolState.shutdown.bind(connectionPoolState),
    },
    root,
  );

  await indexerWorker.initWorker();

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
