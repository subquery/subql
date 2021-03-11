// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {NestLogger} from './utils/logger';

void (async () => {
  const app = await NestFactory.create(AppModule, {
    logger: new NestLogger(),
  });
  await app.listen(process.env.PORT ?? 3000);
})();
