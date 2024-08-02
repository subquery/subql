// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { INestApplication } from '@nestjs/common';
import {
  createNotifyTrigger,
  createSendNotificationTriggerFunction,
  DbOption,
  getFunctions,
  getTriggers,
} from '@subql/node-core';
import { QueryTypes, Sequelize } from '@subql/x-sequelize';
import { rimraf } from 'rimraf';
import { prepareApp } from '../utils/test.utils';
import { ApiService } from './api.service';
import { ProjectService } from './project.service';

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

jest.setTimeout(900000);
describe('Store service integration test', () => {
  let app: INestApplication;
  let projectService: ProjectService;
  let sequelize: Sequelize;
  let tempDir: string;
  let schemaName: string;

  beforeAll(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option,
    );
    await sequelize.authenticate();
  });
  afterEach(async () => {
    await sequelize.dropSchema(schemaName, { logging: false });
    await app?.close();
  });

  afterAll(async () => {
    await rimraf(tempDir);
  });

  it('Correct db sync on historical project', async () => {
    // on uniswap complex schema
    const cid = 'QmNUNBiVC1BDDNbXCbTxzPexodbSmTqZUaohbeBae6b6r8';
    schemaName = 'sync-schema-1';

    app = await prepareApp(schemaName, cid, false);

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);

    tempDir = (projectService as any).project.root;

    const result = await sequelize.query<{ table_name: string }>(
      `
       SELECT 
          table_name
        FROM 
          information_schema.tables
        WHERE 
          table_schema = :schema; 
        `,
      {
        type: QueryTypes.SELECT,
        replacements: { schema: schemaName },
      },
    );
    const expectedTables = result.map((t) => t.table_name);

    const columnResult = await sequelize.query(
      `
        SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = :schema
AND table_name = 'positions';
`,
      {
        type: QueryTypes.SELECT,
        replacements: { schema: schemaName },
      },
    );
    expect(expectedTables.sort()).toStrictEqual(
      [
        'factories',
        'bundles',
        'tokens',
        '_metadata',
        'white_list_pools',
        'pools',
        'ticks',
        'positions',
        'position_snapshots',
        'transactions',
        'mints',
        'burns',
        'swaps',
        'collects',
        'flashes',
        'uniswap_day_data',
        'pool_day_data',
        'pool_hour_data',
        'tick_hour_data',
        'tick_day_data',
        'token_day_data',
        'token_hour_data',
      ].sort(),
    );
    expect(
      columnResult.find((c: any) => c.column_name === 'token0_id'),
    ).toStrictEqual({
      column_name: 'token0_id',
      data_type: 'text',
      is_nullable: 'NO',
    });

    expect(
      columnResult.find((c: any) => c.column_name === '_block_range'),
    ).toStrictEqual({
      column_name: '_block_range',
      data_type: 'int8range',
      is_nullable: 'NO',
    });

    expect(
      columnResult.find((c: any) => c.column_name === 'withdrawn_token0'),
    ).toStrictEqual({
      column_name: 'withdrawn_token0',
      data_type: 'double precision',
      is_nullable: 'NO',
    });
    expect(
      columnResult.find((c: any) => c.column_name === '_id'),
    ).toStrictEqual({
      column_name: '_id',
      data_type: 'uuid',
      is_nullable: 'NO',
    });
  });
  it('Correct db sync on non-historical', async () => {
    const cid = 'QmNUNBiVC1BDDNbXCbTxzPexodbSmTqZUaohbeBae6b6r8';
    schemaName = 'sync-schema-2';

    app = await prepareApp(schemaName, cid, true);

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);

    tempDir = (projectService as any).project.root;

    const [result] = await sequelize.query(
      `SELECT
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type,
    fk.constraint_name AS foreign_key_constraint_name,
    fk.reference_table AS foreign_table,
    fk.reference_column AS foreign_column
FROM
    pg_catalog.pg_attribute a
        LEFT JOIN
    pg_catalog.pg_class c ON c.oid = a.attrelid
        LEFT JOIN
    pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN
    (SELECT
         pg_constraint.conname AS constraint_name,
         pg_constraint.conrelid AS conrelid,
         pg_attribute.attname AS attname,
         pg_class.relname AS reference_table,
         pg_attribute2.attname AS reference_column
     FROM
         pg_constraint
             JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
             JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
             JOIN pg_attribute ON pg_attribute.attrelid = pg_class.oid AND pg_attribute.attnum = ANY(pg_constraint.conkey)
             JOIN pg_class AS pg_class2 ON pg_class2.oid = pg_constraint.confrelid
             JOIN pg_attribute AS pg_attribute2 ON pg_attribute2.attrelid = pg_class2.oid AND pg_attribute2.attnum = ANY(pg_constraint.confkey)
     WHERE
         pg_constraint.contype = 'f'
       AND pg_namespace.nspname = :schema
    ) AS fk ON fk.conrelid = c.oid AND fk.attname = a.attname
WHERE
    c.relkind = 'r' -- r = ordinary table
  AND a.attnum > 0 -- positive attnum indicates a real column
  AND NOT a.attisdropped -- column is not dropped
  AND c.relname = 'swaps'
  AND n.nspname = :schema
ORDER BY
    a.attnum;`,
      {
        replacements: { schema: schemaName },
      },
    );
    const expectedForeignKey = result.find(
      (c: any) => c.column_name === 'token1_id',
    );
    expect(expectedForeignKey).toStrictEqual({
      column_name: 'token1_id',
      column_type: 'text',
      foreign_key_constraint_name: 'swaps_token1_id_fkey',
      foreign_table: 'swaps',
      foreign_column: 'id',
    });
  });
  //

  it('Cyclic relations on non-historical', async () => {
    const cid = 'QmTLwdpfE7xsmAtPj3Bep9KKgAPbt2tvXisUHcHys6anSG';
    schemaName = 'sync-schema-3';

    app = await prepareApp(schemaName, cid, true);

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);

    tempDir = (projectService as any).project.root;

    const [result] = await sequelize.query(
      `
        SELECT
    tc.constraint_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='accounts' 
    AND tc.table_schema= :schema
        `,
      { type: QueryTypes.SELECT, replacements: { schema: schemaName } },
    );

    expect(result).toStrictEqual({
      constraint_name: 'accounts_transfer_id_id_fkey',
      column_name: 'transfer_id_id',
      foreign_table_name: 'transfers',
      foreign_column_name: 'id',
    });
  });
  it('Init with enums', async () => {
    const cid = 'QmVDDxVgmkKzXKcK5YBkEu3Wvzao7uQxear2SVLTUg2bQ1';
    schemaName = 'sync-schema-4';

    app = await prepareApp(schemaName, cid, true);

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);

    tempDir = (projectService as any).project.root;

    const result = await sequelize.query<{ enum_type: string }>(
      `
      SELECT n.nspname AS schema_name,
       t.typname AS enum_type,
       e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = :schema -- Replace 'public' with your schema name if different
ORDER BY t.typname, e.enumsortorder;`,
      { type: QueryTypes.SELECT, replacements: { schema: schemaName } },
    );
    expect(result.length).toBe(3);
    expect(result.map((r) => r.enum_type)).toStrictEqual([
      '65c7fd4e5d',
      '65c7fd4e5d',
      '65c7fd4e5d',
    ]);
  });
  it('Able to drop notification triggers and functions', async () => {
    // if subscription is no longer enabled should be able to drop all prior triggers and functions related to subscription
    const cid = 'Qma3HraGKnH5Gte2WVs4sAAY6z5nBSqVuVq7Ef3eVQQPvz';
    schemaName = 'sync-schema-5';

    // simulate start with subscription then without subscription
    const initQueries = [
      `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`,
      ` CREATE TABLE IF NOT EXISTS "${schemaName}"."transfers" ("id" text NOT NULL,
            "amount" numeric NOT NULL,
            "block_number" integer NOT NULL,
            "date" timestamp NOT NULL,
            "from_id" text NOT NULL,
            "to_id" text NOT NULL,
            "_id" UUID NOT NULL,
            "_block_range" int8range NOT NULL, PRIMARY KEY ("_id"));`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."accounts" ("id" text NOT NULL,
          "public_key" text NOT NULL,
          "first_transfer_block" integer,
          "last_transfer_block" integer,
          "_id" UUID NOT NULL,
          "_block_range" int8range NOT NULL, PRIMARY KEY ("_id"));`,
      createSendNotificationTriggerFunction(schemaName),
      createNotifyTrigger(schemaName, 'transfers'),
      createNotifyTrigger(schemaName, 'accounts'),
    ];
    for (const q of initQueries) {
      await sequelize.query(q);
    }

    app = await prepareApp(schemaName, cid, false, false);

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);

    tempDir = (projectService as any).project.root;

    const accountTrigger = await getTriggers(sequelize, '0xe2ae28f317df40c5');
    const transferTrigger = await getTriggers(sequelize, '0x2416ab4b88a0cdac');

    const functions = await getFunctions(
      sequelize,
      schemaName,
      'send_notification',
    );

    expect(accountTrigger.length).toBe(0);
    expect(transferTrigger.length).toBe(0);
    expect(functions.length).toBe(0);
  });
});
