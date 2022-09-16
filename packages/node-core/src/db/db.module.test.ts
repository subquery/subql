// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {ConfigureModule} from '@subql/node/src/configure/configure.module';
import {Sequelize} from 'sequelize';
import {NodeConfig} from '../configure/NodeConfig';
import {SubqueryRepo} from '../entities';
import {DbModule} from './db.module';

const nodeConfig = new NodeConfig({subquery: 'packages/node-core/test/v1.0.0', subqueryName: 'test'});

describe('DbModule', () => {
  let app: INestApplication;

  afterEach(async () => {
    return app?.close();
  });

  it('can connect to database', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigureModule.testRegister(nodeConfig),
        DbModule.forRootTest(
          {
            host: process.env.DB_HOST ?? '127.0.0.1',
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
            username: process.env.DB_USER ?? 'postgres',
            password: process.env.DB_PASS ?? 'postgres',
            database: process.env.DB_DATABASE ?? 'postgres',
          },
          nodeConfig
        ),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    const sequelize = app.get(Sequelize);
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  }, 30000);

  it('can load subquery model', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigureModule.testRegister(nodeConfig),
        DbModule.forRootTest(
          {
            host: process.env.DB_HOST ?? '127.0.0.1',
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
            username: process.env.DB_USER ?? 'postgres',
            password: process.env.DB_PASS ?? 'postgres',
            database: process.env.DB_DATABASE ?? 'postgres',
          },
          nodeConfig
        ),
        DbModule.forFeature(['Subquery']),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    const subqueryRepo: SubqueryRepo = app.get('Subquery');
    await expect(subqueryRepo.describe()).resolves.toBeTruthy();
  }, 30000);
});
