// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {SchedulerRegistry} from '@nestjs/schedule';
import {MMRMigrateService} from '../indexer';

@Module({
  providers: [SchedulerRegistry, MMRMigrateService],
  controllers: [],
})
export class MMRMigrateFeatureModule {}
