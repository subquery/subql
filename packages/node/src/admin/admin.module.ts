// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { adminControllers, adminServices } from '@subql/node-core';
import { FetchModule } from '../indexer/fetch.module';

@Module({
  imports: [FetchModule],
  controllers: [...adminControllers],
  providers: [...adminServices],
})
export class AdminModule {}
