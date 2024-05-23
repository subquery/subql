// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { MonitorService } from '@subql/node-core';
import { adminControllers, adminServices } from '@subql/node-core/admin';

@Module({
  controllers: [...adminControllers],
  providers: [MonitorService, ...adminServices],
})
export class AdminModule {}
