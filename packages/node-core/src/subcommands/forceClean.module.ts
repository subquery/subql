// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {SchedulerRegistry} from '@nestjs/schedule';
import {ForceCleanService} from './forceClean.service';

@Module({
  providers: [ForceCleanService, SchedulerRegistry],
  controllers: [],
})
export class ForceCleanFeatureModule {}
