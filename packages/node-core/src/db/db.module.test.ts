// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../configure/NodeConfig';
import {DbModule} from './db.module';

const nodeConfig = new NodeConfig({subquery: 'packages/node-core/test/v1.0.0', subqueryName: 'test'});

describe('DbModule', () => {
  let app: INestApplication;

  afterEach(async () => {
    return app?.close();
  });

  it('can connect to database', async () => {
    const module = await Test.createTestingModule({
      imports: [DbModule.forRootWithConfig(nodeConfig)],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    const sequelize = app.get(Sequelize);
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  }, 30000);

  it('can load subquery model', async () => {
    const module = await Test.createTestingModule({
      imports: [DbModule.forRootWithConfig(nodeConfig)],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    // const subqueryRepo: SubqueryRepo = app.get('Subquery');
    // await expect(subqueryRepo.describe()).resolves.toBeTruthy();
  }, 30000);
});
