// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {ConfigureModule} from './configure/configure.module';

@Module({
  imports: [ConfigureModule.register()],
  controllers: [],
})
export class AppModule {}
