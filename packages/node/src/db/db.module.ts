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

const sequelizeFactory = (option: DbOption) => async () => {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    username: option.username,
    password: option.password,
    database: option.database,
    host: option.host,
    port: option.port,
  });
  await sequelize.authenticate();
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
