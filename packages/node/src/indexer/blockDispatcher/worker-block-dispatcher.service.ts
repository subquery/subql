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
  IUnfinalizedBlocksService,
} from '@subql/node-core';
import { Store } from '@subql/types-ethereum';
import chalk from 'chalk';
import {
  SubqlProjectDs,
  SubqueryProject,
} from '../../configure/SubqueryProject';
import { EthereumBlockWrapped } from '../../ethereum/block.ethereum';
import { DynamicDsService } from '../dynamic-ds.service';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { IIndexerWorker, IInitIndexerWorker } from '../worker/worker';
import { HostUnfinalizedBlocks } from '../worker/worker.unfinalizedBlocks.service';

const logger = getLogger('WorkerBlockDispatcherService');

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

async function createIndexerWorker(
  store: Store,
  dynamicDsService: IDynamicDsService<SubqlProjectDs>,
  unfinalizedBlocksService: IUnfinalizedBlocksService<EthereumBlockWrapped>,
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
  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService') projectService: IProjectService<SubqlProjectDs>,
    smartBatchService: SmartBatchService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiService: PoiService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksSevice: UnfinalizedBlocksService,
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
        ),
    );
  }

  protected async fetchBlock(
    worker: IndexerWorker,
    height: number,
  ): Promise<void> {
    const start = new Date();
    await worker.fetchBlock(height);
    const end = new Date();

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
