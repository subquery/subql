// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {CacheMetadataModel, DbOption, MetadataFactory} from '@subql/node-core';
import {QueryTypes, Sequelize} from '@subql/x-sequelize';

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

describe('cacheMetadata integration', () => {
  let sequelize: Sequelize;
  let schema: string;

  beforeAll(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();
  });

  afterEach(async () => {
    await sequelize.dropSchema(schema, {logging: false});
  });
  afterAll(async () => {
    await sequelize.close();
  });

  it('Ensure increment keys are created on _metadata table', async () => {
    schema = '"metadata-test-1"';
    await sequelize.createSchema(schema, {});
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS ${schema}."_metadata" ("key" VARCHAR(255) , "value" JSONB, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("key"));`
    );

    const metaDataRepo = await MetadataFactory(sequelize, schema, false, '1');

    const cacheMetadataModel = new CacheMetadataModel(metaDataRepo);

    // create key at 0
    await (cacheMetadataModel as any).incrementJsonbCount('schemaMigrationCount');

    // increment by 1
    await (cacheMetadataModel as any).incrementJsonbCount('schemaMigrationCount');

    // increase by 100
    await (cacheMetadataModel as any).incrementJsonbCount('schemaMigrationCount', 100);

    const v = (await sequelize.query(
      `
            SELECT * FROM ${schema}."_metadata"
            WHERE key = 'schemaMigrationCount';
        `,
      {
        type: QueryTypes.SELECT,
      }
    )) as any[];
    expect(v.length).toBe(1);
    expect(v[0].value).toBe(101);
  });
});
