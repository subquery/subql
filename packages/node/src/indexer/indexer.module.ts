// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiService } from '@subql/common-node';
import { EthereumApiService } from '../avalanche';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DbModule } from '../db/db.module';
import { getYargsOption } from '../yargs';
import { BenchmarkService } from './benchmark.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { StoreService } from './store.service';
import {
  BlockDispatcherService,
  WorkerBlockDispatcherService,
} from './worker/block-dispatcher.service';
import { WorkerService } from './worker/worker.service';

const { argv } = getYargsOption();

const ApiServiceProvider = {
  provide: ApiService,
  useFactory: async (project: SubqueryProject) => {
    const apiService = new EthereumApiService(project);
    await apiService.init();
    return apiService;
  },
  inject: [SubqueryProject],
};

const BaseProvider = [
  IndexerManager,
  StoreService,
  FetchService,
  ApiServiceProvider,
  BenchmarkService,
  DictionaryService,
  SandboxService,
  DsProcessorService,
  DynamicDsService,
  PoiService,
  MmrService,
  ProjectService,
  WorkerService,
  {
    provide: 'IBlockDispatcher',
    inject: [SubqueryProject, EventEmitter2],
    useClass: argv.workers
      ? WorkerBlockDispatcherService
      : BlockDispatcherService,
  },
];

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: BaseProvider,
  exports: [StoreService],
})
export class IndexerModule {}
