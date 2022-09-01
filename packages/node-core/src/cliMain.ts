// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {NestFactory} from '@nestjs/core';
import {AppModule} from './cliAppModule';

export async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: false,
    });
    await app.init();

    // start store.service
    // start project.service
    // start mmrService

    console.log('yay, your code works');
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}
