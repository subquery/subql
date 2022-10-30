// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BenchmarkService,
  MmrService,
  StoreService,
  PoiService,
  DbModule,
  NodeConfig,
} from '@subql/node-core';
import { ApiService } from './api.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import {
  BlockDispatcherService,
  WorkerBlockDispatcherService,
} from './worker/block-dispatcher.service';

@Module({
  providers: [
    StoreService,
    ApiService,
    IndexerManager,
    {
      provide: 'IBlockDispatcher',
      useFactory: (
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
        projectService: ProjectService,
        apiService: ApiService,
        indexerManager: IndexerManager,
      ) =>
        nodeConfig.workers !== undefined
          ? new WorkerBlockDispatcherService(
              nodeConfig,
              eventEmitter,
              projectService,
            )
          : new BlockDispatcherService(
              apiService,
              nodeConfig,
              indexerManager,
              eventEmitter,
              projectService,
            ),
      inject: [
        NodeConfig,
        EventEmitter2,
        ProjectService,
        ApiService,
        IndexerManager,
      ],
    },
    FetchService,
    BenchmarkService,
    DictionaryService,
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    PoiService,
    MmrService,
    ProjectService,
  ],
  exports: [StoreService, MmrService],
})
export class FetchModule {}
