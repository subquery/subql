// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {BaseDataSource} from '@subql/types-core';
import {IApiConnectionSpecific} from '../../api.service';
import {IBlockchainService} from '../../blockchain.service';
import {IProjectUpgradeService, NodeConfig} from '../../configure';
import {ConnectionPoolStateManager} from '../connectionPoolState.manager';
import {DynamicDsService} from '../dynamic-ds.service';
import {InMemoryCacheService} from '../inMemoryCache.service';
import {MonitorService} from '../monitor.service';
import {MultiChainRewindService} from '../multiChainRewind.service';
import {PoiSyncService} from '../poi';
import {ProjectService} from '../project.service';
import {StoreService} from '../store.service';
import {IStoreModelProvider} from '../storeModelProvider';
import {IIndexerManager, ISubqueryProject} from '../types';
import {UnfinalizedBlocksService} from '../unfinalizedBlocks.service';
import {createIndexerWorker, IBaseIndexerWorker} from '../worker';
import {IBlockDispatcher} from './base-block-dispatcher';
import {BlockDispatcher} from './block-dispatcher';
import {WorkerBlockDispatcher} from './worker-block-dispatcher';

export const blockDispatcherFactory =
  <DS extends BaseDataSource, Block, ApiConn extends IApiConnectionSpecific, Worker extends IBaseIndexerWorker>(
    workerPath: string,
    workerFns: Parameters<typeof createIndexerWorker<Worker, ApiConn, Block, DS>>[1],
    workerData?: unknown
  ) =>
  (
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    projectService: ProjectService<DS>,
    projectUpgradeService: IProjectUpgradeService,
    cacheService: InMemoryCacheService,
    storeService: StoreService,
    storeModelProvider: IStoreModelProvider,
    poiSyncService: PoiSyncService,
    project: ISubqueryProject,
    dynamicDsService: DynamicDsService<DS>,
    unfinalizedBlocks: UnfinalizedBlocksService,
    connectionPoolState: ConnectionPoolStateManager<ApiConn>,
    blockchainService: IBlockchainService<DS>,
    indexerManager: IIndexerManager<Block, DS>,
    multiChainRewindService: MultiChainRewindService,
    monitorService?: MonitorService
  ): IBlockDispatcher<Block> => {
    return nodeConfig.workers
      ? new WorkerBlockDispatcher<DS, Worker, Block, ApiConn>(
          nodeConfig,
          eventEmitter,
          projectService,
          projectUpgradeService,
          storeService,
          storeModelProvider,
          cacheService,
          poiSyncService,
          dynamicDsService,
          unfinalizedBlocks,
          connectionPoolState,
          project,
          blockchainService,
          multiChainRewindService,
          workerPath,
          workerFns,
          monitorService,
          workerData
        )
      : new BlockDispatcher(
          nodeConfig,
          eventEmitter,
          projectService,
          projectUpgradeService,
          storeService,
          storeModelProvider,
          poiSyncService,
          project,
          blockchainService,
          indexerManager,
          multiChainRewindService
        );
  };
