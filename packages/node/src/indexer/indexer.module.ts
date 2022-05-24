// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { SubqueryCosmosProject } from '../configure/cosmosproject.model';
import { NodeConfig } from '../configure/NodeConfig';
import { DbModule } from '../db/db.module';
import { ApiCosmosService } from './apicosmos.service';
import { BenchmarkService } from './benchmark.service';
import { CosmosDsProcessorService } from './cosmosds-processor.service';
import { DynamicDsService } from './cosmosdynamic-ds.service';
import { CosmosDictionaryService } from './dictionarycosmos.service';
import { FetchCosmosService } from './fetchcosmos.service';
import { IndexerCosmosManager } from './indexercosmos.manager';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { SandboxCosmosService } from './sandboxcosmos.service';
import { StoreService } from './store.service';
@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [
    IndexerCosmosManager,
    StoreService,
    {
      provide: ApiCosmosService,
      useFactory: async (
        project: SubqueryCosmosProject,
        nodeConfig: NodeConfig,
      ) => {
        const apiService = new ApiCosmosService(project, nodeConfig);
        await apiService.init();
        return apiService;
      },
      inject: [SubqueryCosmosProject, NodeConfig],
    },
    FetchCosmosService,
    BenchmarkService,
    CosmosDictionaryService,
    SandboxCosmosService,
    CosmosDsProcessorService,
    PoiService,
    MmrService,
    DynamicDsService,
  ],
  exports: [StoreService, MmrService],
})
export class IndexerModule {}
