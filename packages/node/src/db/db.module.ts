// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
import { DynamicModule, Global } from '@nestjs/common';
import { Sequelize } from 'sequelize';
import * as entities from '../entities';

export interface DbOption {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

async function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function establishConnection(
  sequelize: Sequelize,
  numRetries,
): Promise<void> {
  if (numRetries > 0) {
    try {
      console.log(
        'Try to connect to database: ',
        numRetries,
        'attempts remaining',
      );
      await sequelize.authenticate();
      console.log('Connection has been established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error.message);
      console.log('Await retry...');
      await timeout(3000);
      void (await establishConnection(sequelize, numRetries - 1));
    }
  } else {
    console.log('Connect to database failed !');
    process.exit(1);
  }
}

const sequelizeFactory = (option: DbOption) => async () => {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    username: option.username,
    password: option.password,
    database: option.database,
    host: option.host,
    port: option.port,
  });
  const numRetries = 5;
  await establishConnection(sequelize, numRetries);
  for (const factoryFn of Object.keys(entities).filter((k) =>
    /Factory$/.exec(k),
  )) {
    entities[factoryFn](sequelize);
  }
  await sequelize.sync();
  return sequelize;
};

@Global()
export class DbModule {
  static forRoot(option: DbOption): DynamicModule {
    return {
      module: DbModule,
      providers: [
        {
          provide: Sequelize,
          useFactory: sequelizeFactory(option),
        },
        {
          provide: 'DB_OPTION',
          useValue: option,
        },
      ],
      exports: [Sequelize],
    };
  }

  static forFeature(models: string[]): DynamicModule {
    return {
      module: DbModule,
      providers: models.map((model) => ({
        provide: model,
        inject: [Sequelize],
        useFactory: (sequelize: Sequelize) => sequelize.model(model),
      })),
      exports: models,
    };
  }
}
