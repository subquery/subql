// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BenchmarkService,
  MmrService,
  StoreService,
  PoiService,
  NodeConfig,
  SmartBatchService
} from '@subql/node-core';

import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from './api.service';
import {
  BlockDispatcherService,
  WorkerBlockDispatcherService,
} from './blockDispatcher';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { RuntimeService } from './runtime/runtimeService';
import { SandboxService } from './sandbox.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

@Module({
  providers: [
    StoreService,
    ApiService,
    IndexerManager,
    {
      provide: SmartBatchService,
      useFactory: (nodeConfig: NodeConfig) => {
        return new SmartBatchService(nodeConfig.batchSize);
      },
      inject: [NodeConfig],
    },
    {
      provide: 'IBlockDispatcher',
      useFactory: (
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
        projectService: ProjectService,
        apiService: ApiService,
        indexerManager: IndexerManager,
        smartBatchService: SmartBatchService,
      ) =>
        nodeConfig.workers !== undefined
          ? new WorkerBlockDispatcherService(
              nodeConfig,
              eventEmitter,
              projectService,
              smartBatchService,
            )
          : new BlockDispatcherService(
              apiService,
              nodeConfig,
              indexerManager,
              eventEmitter,
              projectService,
              smartBatchService,
            ),
      inject: [
        NodeConfig,
        EventEmitter2,
        ProjectService,
        ApiService,
        IndexerManager,
        SmartBatchService,
      ],
    },
    FetchService,
    BenchmarkService,
    {
      provide: DictionaryService,
      useFactory: async (project: SubqueryProject, nodeConfig: NodeConfig) => {
        const dictionaryService = new DictionaryService(project, nodeConfig);
        await dictionaryService.init();
        return dictionaryService;
      },
      inject: ['ISubqueryProject', NodeConfig],
    },
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    PoiService,
    MmrService,
    ProjectService,
    UnfinalizedBlocksService,
    RuntimeService,
  ],
  exports: [StoreService, MmrService],
})
export class FetchModule {}
