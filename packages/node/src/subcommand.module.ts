// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { DbModule } from '@subql/node-core';
import { SubcommandService } from './utils/subcommand.service';

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [SubcommandService],
  controllers: [],
})
export class SubcommandModule {}
