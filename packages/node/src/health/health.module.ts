// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [],
  providers: [HealthService],
  exports: [],
  controllers: [HealthController],
})
export class HealthModule {}
