// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import {
  ApiService,
  DbModule,
  StoreService,
  PoiService,
  MmrService,
} from '@subql/node-core';
import { AvalancheApiService } from '../avalanche';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { WorkerService } from './worker/worker.service';

const ApiServiceProvider = {
  provide: ApiService,
  useFactory: async (project: SubqueryProject) => {
    const apiService = new AvalancheApiService(project);
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
  DictionaryService,
  SandboxService,
  DsProcessorService,
  DynamicDsService,
  PoiService,
  MmrService,
  ProjectService,
  WorkerService,
];

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: BaseProvider,
  exports: [StoreService],
})
export class IndexerModule {}
