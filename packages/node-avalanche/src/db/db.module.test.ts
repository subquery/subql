// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Sequelize } from 'sequelize';
import { SubqueryRepo } from '../entities';
import { DbModule } from './db.module';

describe('DbModule', () => {
  let app: INestApplication;

  afterEach(async () => {
    return app?.close();
  });

  it('can connect to database', async () => {
    const module = await Test.createTestingModule({
      imports: [
        DbModule.forRoot({
          host: process.env.DB_HOST ?? '127.0.0.1',
          port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
          username: process.env.DB_USER ?? 'postgres',
          password: process.env.DB_PASS ?? 'postgres',
          database: process.env.DB_DATABASE ?? 'postgres',
        }),
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
        DbModule.forRoot({
          host: process.env.DB_HOST ?? '127.0.0.1',
          port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
          username: process.env.DB_USER ?? 'postgres',
          password: process.env.DB_PASS ?? 'postgres',
          database: process.env.DB_DATABASE ?? 'postgres',
        }),
        DbModule.forFeature(['Subquery']),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    const subqueryRepo: SubqueryRepo = app.get('Subquery');
    await expect(subqueryRepo.describe()).resolves.toBeTruthy();
  }, 30000);
});
