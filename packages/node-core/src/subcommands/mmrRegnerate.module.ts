// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Module} from '@nestjs/common';
import {SchedulerRegistry} from '@nestjs/schedule';
import {MmrRegenerateService, MmrService, PgMmrCacheService, StoreCacheService, StoreService} from '../indexer';
import {ReadyController} from '../meta/ready.controller';
import {ReadyService} from '../meta/ready.service';

@Module({
  providers: [
    StoreCacheService,
    StoreService,
    MmrService,
    PgMmrCacheService,
    MmrRegenerateService,
    SchedulerRegistry,
    ReadyService,
  ],
  controllers: [ReadyController],
})
export class MmrRegenerateFeatureModule {}
