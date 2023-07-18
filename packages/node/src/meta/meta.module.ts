// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { metaServices, metaControllers } from '@subql/node-core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { FetchModule } from '../indexer/fetch.module';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';

@Module({
  imports: [PrometheusModule.register(), FetchModule],
  controllers: [...metaControllers, MetaController],
  providers: [...metaServices, MetaService],
})
export class MetaModule {}
