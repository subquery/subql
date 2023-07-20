// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {ConfigureModule} from './configure/configure.module';
import {GraphqlModule} from './graphql/graphql.module';

@Module({
  imports: [ConfigureModule.register(), GraphqlModule],
  controllers: [],
})
export class AppModule {}
