// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {ConfigureModule} from './configure/configure.module';
import {GraphqlModule} from './graphql/graphql.module';
import {ChatModule} from './llm/chat.module';

@Module({
  // the order is essential, the ChatModule must be before the GraphqlModule so /v1/chat/completions
  // can be handled without interference from the GraphqlModule
  imports: [ConfigureModule.register(), ChatModule, GraphqlModule],
  controllers: [],
})
export class AppModule {}
