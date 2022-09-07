// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import {
  BenchmarkService,
  MmrService,
  StoreService,
  PoiService,
  NodeConfig,
  DbModule,
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
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [
    StoreService,
    ApiService,
    IndexerManager,
    {
      provide: 'IBlockDispatcher',
      useFactory: (nodeConfig: NodeConfig) =>
        nodeConfig.workers
          ? WorkerBlockDispatcherService
          : BlockDispatcherService,
      inject: [NodeConfig],
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
