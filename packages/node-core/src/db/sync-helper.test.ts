// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {getDbSizeAndUpdateMetadata} from '@subql/node-core';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../configure/NodeConfig';
import {DbModule} from './db.module';

const nodeConfig = new NodeConfig({subquery: 'packages/node-core/test/v1.0.0', subqueryName: 'test'});

describe('sync helper test', () => {
  let app: INestApplication;
  let sequelize: Sequelize;
  let schema: string;

  afterEach(async () => {
    await sequelize.dropSchema(schema, {});
    await sequelize.close();
    return app?.close();
  });

  it('can check project db size', async () => {
    const module = await Test.createTestingModule({
      imports: [DbModule.forRootWithConfig(nodeConfig)],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    sequelize = app.get(Sequelize);
    schema = 'admin-test';
    await sequelize.createSchema(schema, {});
    // mock create metadata table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"._metadata (
        key VARCHAR(255) NOT NULL PRIMARY KEY,
        value JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    )`);
    const dbSize = await getDbSizeAndUpdateMetadata(sequelize, schema);
    expect(dbSize).not.toBeUndefined();
  }, 50000);
});
