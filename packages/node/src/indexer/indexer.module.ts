// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ApiService } from './api.service';
import { BenchmarkService } from './benchmark.service';
import { DictionaryService } from './dictionary.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { StoreService } from './store.service';

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [
    IndexerManager,
    StoreService,
    ApiService,
    FetchService,
    BenchmarkService,
    DictionaryService,
    PoiService,
    MmrService,
  ],
  exports: [],
})
export class IndexerModule {}
