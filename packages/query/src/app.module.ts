// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Module} from '@nestjs/common';
import {ConfigureModule} from './configure/configure.module';
import {GraphqlModule} from './graphql/graphql.module';

@Module({
  imports: [ConfigureModule.register(), GraphqlModule],
  controllers: [],
})
export class AppModule {}
