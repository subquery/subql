// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { DbModule } from '@subql/node-core/db';
import { BenchmarkService, StoreService } from '@subql/node-core/indexer';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import {
  BlockDispatcherService,
  WorkerBlockDispatcherService,
} from './worker/block-dispatcher.service';

const { argv } = getYargsOption();

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [
    StoreService,
    ApiService,
    IndexerManager,
    {
      provide: 'IBlockDispatcher',
      useClass: argv.workers
        ? WorkerBlockDispatcherService
        : BlockDispatcherService,
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
