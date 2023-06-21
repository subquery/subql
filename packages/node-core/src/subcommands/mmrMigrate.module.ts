// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Module} from '@nestjs/common';
import {SchedulerRegistry} from '@nestjs/schedule';
import {MMRMigrateService} from '../indexer';

@Module({
  providers: [SchedulerRegistry, MMRMigrateService],
  controllers: [],
})
export class MMRMigrateFeatureModule {}
