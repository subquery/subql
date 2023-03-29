// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
} from '@subql/node-core';
import { Store } from '@subql/types';
import chalk from 'chalk';
import { Sequelize, Transaction } from 'sequelize';
import {
  SubqlProjectDs,
  SubqueryProject,
} from '../../configure/SubqueryProject';
import { DynamicDsService } from '../dynamic-ds.service';
import { RuntimeService } from '../runtime/runtimeService';
import {
  IUnfinalizedBlocksService,
  UnfinalizedBlocksService,
} from '../unfinalizedBlocks.service';
import { IIndexerWorker, IInitIndexerWorker } from '../worker/worker';
import { HostUnfinalizedBlocks } from '../worker/worker.unfinalizedBlocks.service';

const logger = getLogger('WorkerBlockDispatcherService');

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

async function createIndexerWorker(
  store: Store,
  dynamicDsService: IDynamicDsService<SubqlProjectDs>,
  unfinalizedBlocksService: IUnfinalizedBlocksService,
): Promise<IndexerWorker> {
  const indexerWorker = Worker.create<
    IInitIndexerWorker,
    HostDynamicDS<SubqlProjectDs> & HostStore & HostUnfinalizedBlocks
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
      storeCount: store.count.bind(store),
      storeGet: store.get.bind(store),
      storeGetByField: store.getByField.bind(store),
      storeGetOneByField: store.getOneByField.bind(store),
      storeSet: store.set.bind(store),
      storeBulkCreate: store.bulkCreate.bind(store),
      storeBulkUpdate: store.bulkUpdate.bind(store),
      storeRemove: store.remove.bind(store),
      dynamicDsCreateDynamicDatasource:
        dynamicDsService.createDynamicDatasource.bind(dynamicDsService),
      dynamicDsGetDynamicDatasources:
        dynamicDsService.getDynamicDatasources.bind(dynamicDsService),
      unfinalizedBlocksProcess:
        unfinalizedBlocksService.processUnfinalizedBlocks.bind(
          unfinalizedBlocksService,
        ),
    },
  );

  await indexerWorker.initWorker();

  return indexerWorker;
}

@Injectable()
export class WorkerBlockDispatcherService
  extends WorkerBlockDispatcher<SubqlProjectDs, IndexerWorker>
  implements OnApplicationShutdown
{
  private runtimeService: RuntimeService;

  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService') projectService: IProjectService,
    smartBatchService: SmartBatchService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    sequelize: Sequelize,
    poiService: PoiService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
    private unfinalizedBlocksSevice: UnfinalizedBlocksService,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      smartBatchService,
      storeService,
      storeCacheService,
      sequelize,
      poiService,
      project,
      dynamicDsService,
      () =>
        createIndexerWorker(
          storeService.getStore(),
          dynamicDsService,
          unfinalizedBlocksSevice,
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

  protected prepareTx(tx: Transaction): void {
    this.unfinalizedBlocksSevice.setTransaction(tx);
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
    const start = new Date();
    await worker.fetchBlock(height, blockSpecVersion);
    const end = new Date();

    const waitTime = end.getTime() - start.getTime();
    if (waitTime > 1000) {
      logger.info(
        `Waiting to fetch block ${height}: ${chalk.red(`${waitTime}ms`)}`,
      );
    } else if (waitTime > 200) {
      logger.info(
        `Waiting to fetch block ${height}: ${chalk.yellow(`${waitTime}ms`)}`,
      );
    }
  }
}
