// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {NestFactory} from '@nestjs/core';
import {AppModule} from './cliAppModule';
import {subcommandsService} from './indexer/subcommands.service';

// const logger = getLogger('subcommand');

export async function bootstrap2(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: false,
    });
    const subcommandService = app.get(subcommandsService);
    await app.init();

    await subcommandService.forceClean().then(() => {
      console.log('yay it clean');
      process.exit(0);
    });

    console.log('yay, your code works');
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}
