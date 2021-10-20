// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { MetaModule } from '../meta/meta.module';
import { MetaService } from '../meta/meta.service';
import { ApiService } from './api.service';
import { BenchmarkService } from './benchmark.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { SandboxService } from './sandbox.service';
import { StoreService } from './store.service';

@Module({
  imports: [DbModule.forFeature(['Subquery']), MetaModule],
  providers: [
    IndexerManager,
    StoreService,
    ApiService,
    FetchService,
    BenchmarkService,
    DictionaryService,
    SandboxService,
    DsProcessorService,
    PoiService,
    MmrService,
  ],
  exports: [StoreService],
})
export class IndexerModule {}
