// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { promisify } from 'util';
import { INestApplication } from '@nestjs/common';
import {
  DbOption,
  generateHashedIndexName,
  StoreCacheService,
} from '@subql/node-core';
import { IndexesOptions, QueryTypes, Sequelize } from '@subql/x-sequelize';
import rimraf from 'rimraf';
import { ApiService } from '../indexer/api.service';
import { ProjectService } from '../indexer/project.service';
import { prepareApp } from '../utils/test.utils';

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

jest.setTimeout(900000);
describe('SchemaMigration integration tests', () => {
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
    await promisify(rimraf)(tempDir);
  });

  it('Migrate to new schema', async () => {
    const cid = 'QmQTSF5xjeyrpEN1BYe34Un7erJoWvUpcSjc5GeBTVtNCS';
    schemaName = 'test-migrations-1';
    app = await prepareApp(schemaName, cid, false);

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);
    const projectUpgradeService = app.get('IProjectUpgradeService');

    await apiService.init();
    await projectService.init(1);

    await projectUpgradeService.setCurrentHeight(1000);
    tempDir = (projectService as any).project.root;

    const dbResults = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='${schemaName}';`,
      { type: QueryTypes.SELECT },
    );
    const tableNames: string[] = dbResults.map((row: string[]) => {
      return row[0];
    });

    expect(tableNames).toContain('_metadata');
    expect(tableNames).toContain('accounts');
    expect(tableNames).not.toContain('test_entities');
    expect(tableNames).toContain('transfers');
    expect(tableNames).toContain('test_entity_twos');

    // Query to check the structure of 'accounts' table
    const accountColumns = await sequelize.query(
      `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = :schema AND table_name = :table ;`,
      {
        type: QueryTypes.SELECT,
        replacements: { schema: schemaName, table: 'accounts' },
      },
    );
    const firstTransferBlockColumn = accountColumns.find(
      (row: { column_name: string; is_nullable: string }) =>
        row.column_name === 'first_transfer_block',
    ) as { column_name: string; is_nullable: string };
    expect(firstTransferBlockColumn).toBeDefined();
    expect(firstTransferBlockColumn.is_nullable).toEqual('YES');

    const [columnResult] = await sequelize.query(
      `SELECT
                column_name,
                data_type,
                is_nullable
            FROM
                information_schema.columns
            WHERE
                table_schema = :schema
                AND table_name = 'test_entity_twos'
                AND column_name = '_block_range';`,
      {
        replacements: { schema: schemaName },
      },
    );

    const [indexResult] = await sequelize.query(
      `SELECT
                  indexname,
                  indexdef
              FROM
                  pg_indexes
              WHERE
                  schemaname = :schema
                  AND tablename = 'test_entity_twos';`,
      {
        replacements: { schema: schemaName },
      },
    );

    expect(columnResult[0]).toStrictEqual({
      column_name: '_block_range',
      data_type: 'int8range',
      is_nullable: 'NO',
    });
    const indexOptions: IndexesOptions = {
      fields: ['id'],
      unique: false,
      parser: null,
      name: 'test_entity_twos_id',
    };
    const expectIndexName = generateHashedIndexName(
      'TestEntityTwo',
      indexOptions,
    );

    expect(indexResult).toStrictEqual([
      {
        indexname: 'test_entity_twos_pkey',
        indexdef: `CREATE UNIQUE INDEX test_entity_twos_pkey ON "${schemaName}".test_entity_twos USING btree (_id)`,
      },
      {
        indexname: expectIndexName,
        indexdef: `CREATE INDEX "0x30cf0ebdd6c10eed" ON "${schemaName}".test_entity_twos USING btree (id)`,
      },
    ]);
  });
  it('Ensure correct JSON field creation with nested json', async () => {
    const jsonCid = 'QmPF13eV5syiUtgj7oAfi8CVtJHWYnj4P2oAfGETFYUq3f';
    schemaName = 'test-migrations-2';
    app = await prepareApp(schemaName, jsonCid);

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);
    const projectUpgradeService = app.get('IProjectUpgradeService');

    await apiService.init();
    await projectService.init(1);

    await projectUpgradeService.setCurrentHeight(1000);

    tempDir = (projectService as any).project.root;

    const [exampleFieldColumn] = await sequelize.query(
      `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = '${schemaName}'
            AND table_name = 'test_entities'
            AND column_name = 'example_field';
        `,
      { type: QueryTypes.SELECT },
    );
    expect((exampleFieldColumn as any).data_type).toEqual('jsonb');
  });
  it('Migration on index removal, creation', async () => {
    const cid = 'QmRXzte2erbpUjqFyd5V2JroZAoD2iEWVxs3GM33sGpnux';
    schemaName = 'test-migrations-5';
    app = await prepareApp(schemaName, cid);

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);
    const projectUpgradeService = app.get('IProjectUpgradeService');

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await projectUpgradeService.setCurrentHeight(1000);

    const [indexResult] = await sequelize.query(
      `SELECT
                  indexname,
                  indexdef
              FROM
                  pg_indexes
              WHERE
                  schemaname = :schema ;`,
      {
        replacements: { schema: schemaName },
      },
    );
    const findIndex = (modelName: string, unique: boolean, fields: string[]) =>
      indexResult.find(
        (i: { indexname: string; indexdef: string }) =>
          i.indexname ===
          generateHashedIndexName(modelName, { unique, fields }),
      );

    const uniqueIndex = findIndex('NewIndexOne', true, [
      'name',
      '_block_range',
    ]);
    const nonUniqueIndex = findIndex('NewIndexTwo', false, [
      'name',
      '_block_range',
    ]);
    const compositeIndex = findIndex('NewIndexComposite', false, [
      'block',
      'block_two',
      '_block_range',
    ]);
    const droppedUniqueIndex = findIndex('DropSingleIndex', true, [
      'example_field',
      '_block_range',
    ]);
    const droppedCompositeIndex = findIndex('DropCompositeIndex', false, [
      'block',
      'block_two',
      '_block_range',
    ]);

    expect(uniqueIndex).toBeTruthy();
    expect(nonUniqueIndex).toBeTruthy();
    expect(compositeIndex).toBeTruthy();

    expect(droppedCompositeIndex).toBe(undefined);
    expect(droppedUniqueIndex).toBe(undefined);
  });
  it('Should initialize correct schema based on startHeight', async () => {
    // parent: QmQuww78v2XeGVVPVj6rWLhqvw78xrcR2SZJ5QLe7aaxu3
    // child : QmZcEv4UWrCkkiHUmtz7q5AAXdu82aAdkxH8X8BQK3TjCy
    const cid = 'QmZcEv4UWrCkkiHUmtz7q5AAXdu82aAdkxH8X8BQK3TjCy';
    schemaName = 'test-migrations-6';

    app = await prepareApp(schemaName, cid);

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);

    const dbResults = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema= :schema;`,
      { type: QueryTypes.SELECT, replacements: { schema: schemaName } },
    );
    const tableNames: string[] = dbResults.map((row: string[]) => {
      return row[0];
    });

    expect(tableNames).toContain('_metadata');
    expect(tableNames).toContain('accounts');
    expect(tableNames).toContain('test_index_ones');
    expect(tableNames).toContain('transfers');
  });
  it('On entity drop isRewindable should be false', async () => {
    const cid = 'QmZcEv4UWrCkkiHUmtz7q5AAXdu82aAdkxH8X8BQK3TjCy';
    schemaName = 'test-migrations-7';
    app = await prepareApp(schemaName, cid);

    projectService = app.get('IProjectService');

    const apiService = app.get(ApiService);
    await apiService.init();
    await projectService.init(1);

    tempDir = (projectService as any).project.root;
    const isRewindable = (projectService as any).projectUpgradeService
      .isRewindable;

    expect(isRewindable).toBe(false);
  });
  it('Should update sequelize Models in cachedModels', async () => {
    const cid = 'QmWKRpKXgmPArnAGRNaK2wTiWNuosUtxBcB581mcth8B82';
    schemaName = 'test-migrations-8';
    app = await prepareApp(schemaName, cid);

    projectService = app.get('IProjectService');
    const projectUpgradeService = app.get('IProjectUpgradeService');
    const storeCache = app.get(StoreCacheService);
    const cacheSpy = jest.spyOn(storeCache, 'updateModels');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await projectUpgradeService.setCurrentHeight(1000);

    const cachedModels = (storeCache as any).cachedModels;

    expect(Object.keys(cachedModels)).toStrictEqual([
      '_metadata',
      'AddedEntity',
      'Account',
    ]);
    expect(
      Object.keys((cachedModels.Account.model as any).rawAttributes).includes(
        'addedField',
      ),
    ).toBe(true);
    expect(
      Object.keys((cachedModels.Account.model as any).rawAttributes).includes(
        'dropField',
      ),
    ).toBe(false);

    expect(cacheSpy).toHaveBeenCalledTimes(1);
  });
  it('Ensure no duplication in cacheModels', async () => {
    const cid = 'QmSmQvbssnCCH2fdi2VyqCQsjKti7tKsJMtxMUmZKUjhq7';
    schemaName = 'test-migrations-9';
    app = await prepareApp(schemaName, cid);

    projectService = app.get('IProjectService');
    const projectUpgradeService = app.get('IProjectUpgradeService');
    const storeCache = app.get(StoreCacheService);
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await projectUpgradeService.setCurrentHeight(1000);

    const cachedModels = (storeCache as any).cachedModels;

    expect(Object.keys(cachedModels)).toStrictEqual(['_metadata', 'Account']);
  });
  it('Ensure correctness on non-historical migrate', async () => {
    const cid = 'QmQTSF5xjeyrpEN1BYe34Un7erJoWvUpcSjc5GeBTVtNCS';
    schemaName = 'test-migrations-10';
    app = await prepareApp(schemaName, cid, true);

    projectService = app.get('IProjectService');
    const projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await projectUpgradeService.setCurrentHeight(1000);

    const [results] = await sequelize.query(
      `SELECT
                column_name
            FROM
                information_schema.columns
            WHERE
                table_schema = :schema
                AND table_name = 'test_entity_twos'`,
      {
        replacements: { schema: schemaName },
      },
    );

    expect(
      !!results.find(
        (c: { column_name: string }) => c.column_name === '_block_range',
      ),
    ).toBe(false);
  });
  it('On Failed migration, no metadata transaction should be applied', async () => {
    const processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementationOnce((() => {
        throw new Error();
      }) as any);

    const cid = 'QmXkwoV6Si2dfCvGDdAEnhRbQtDq1RTNrjFVsVafhs3qMq';
    schemaName = 'test-migrations-11';
    app = await prepareApp(schemaName, cid);

    projectService = app.get('IProjectService');
    const projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await expect(
      projectUpgradeService.setCurrentHeight(2000),
    ).rejects.toThrow();

    expect(processExitSpy).toHaveBeenCalledTimes(1);
    expect(processExitSpy).toHaveBeenCalledWith(1);

    const [result] = await sequelize.query(
      `SELECT * FROM "${schemaName}"._metadata WHERE key = 'lastProcessedHeight'`,
      { type: QueryTypes.SELECT },
    );

    expect(result).toBe(undefined);

    processExitSpy.mockRestore();
  });
  it('add relations on migration with historical', async () => {
    const cid = 'QmU4ca4G8Bg8qu1AapmGZyuAjYtZfBNSN9WiubkQai35Bs';
    schemaName = 'test-migrations-12';
    app = await prepareApp(schemaName, cid, false, false);

    projectService = app.get('IProjectService');
    const projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await projectUpgradeService.setCurrentHeight(2000);

    const [indexes] = await sequelize.query(
      `
    SELECT
    idx.indexname AS index_name,
    idx.indexdef AS index_definition
FROM
    pg_indexes idx
WHERE
    idx.schemaname = :schema 
    AND idx.tablename = 'accounts';
    `,
      {
        replacements: { schema: schemaName },
      },
    );

    expect(indexes).toStrictEqual([
      {
        index_definition: `CREATE UNIQUE INDEX accounts_pkey ON "${schemaName}".accounts USING btree (_id)`,
        index_name: 'accounts_pkey',
      },
      {
        index_definition: `CREATE INDEX "0x4cb388e53e3e30f3" ON "${schemaName}".accounts USING btree (id)`,
        index_name: '0x4cb388e53e3e30f3',
      },
      {
        index_definition: `CREATE INDEX "0xc1a3a8c963b2bea2" ON "${schemaName}".accounts USING gist (one_to_one_relation_id, _block_range)`,
        index_name: '0xc1a3a8c963b2bea2',
      },
    ]);
  });

  it('add relations on migration no historical', async () => {
    // add a has many and belong to, and one to one
    const cid = 'QmU4ca4G8Bg8qu1AapmGZyuAjYtZfBNSN9WiubkQai35Bs';
    schemaName = 'test-migrations-13';
    app = await prepareApp(schemaName, cid, true, false);

    projectService = app.get('IProjectService');
    const projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await projectUpgradeService.setCurrentHeight(2000);

    const [result] = await sequelize.query(
      `
    SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM
    information_schema.table_constraints AS tc
        JOIN
    information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        JOIN
    information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = :schema;`,
      {
        replacements: { schema: schemaName },
      },
    );

    expect(result.length).toBe(6);
  });
  it('drop relational with no historical', async () => {
    const cid = 'Qmd3UxXvkUu9L5xAwaaJJ3pu5U52MMa5fLZxYYmgcs2EMn';
    schemaName = 'test-migrations-14';
    app = await prepareApp(schemaName, cid, true, false);

    projectService = app.get('IProjectService');
    const projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await projectUpgradeService.setCurrentHeight(2000);

    await projectUpgradeService.setCurrentHeight(4000);

    const [result] = await sequelize.query(`
    SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM
    information_schema.table_constraints AS tc
        JOIN
    information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        JOIN
    information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = '${schemaName}';`);

    expect(result.length).toBe(3);
  });
  it('Able to drop table and column with relations', async () => {
    const cid = 'QmRpysswwMpcmKfQpMTRepi386hUp7QaiZYUhwbM3JcsjC';
    schemaName = 'test-migrations-15';
    app = await prepareApp(schemaName, cid, true, false);

    projectService = app.get('IProjectService');
    const projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await projectUpgradeService.setCurrentHeight(2000);

    await projectUpgradeService.setCurrentHeight(4000);

    const result = await sequelize.query(
      `SELECT table_name
FROM information_schema.tables
WHERE table_schema = :schema
`,
      {
        replacements: { schema: schemaName },
        type: QueryTypes.SELECT,
      },
    );
    expect(result.length).toBe(4);
    expect(result).not.toContain({ table_name: 'accounts' });
  });
  it('create subscription on table creation', async () => {
    const cid = 'QmbsJ7R6w19YCnRsJT72W8giZGW4pujfHeH1ZPL2qqMYHj';
    schemaName = 'test-migrations-16';
    app = await prepareApp(schemaName, cid, true, true);

    projectService = app.get('IProjectService');
    const projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await projectUpgradeService.setCurrentHeight(2000);
    const result = await sequelize.query(
      `SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = :table AND event_object_schema = :schema ;
        `,
      {
        replacements: {
          schema: schemaName,
          table: 'many_to_many_test_entities',
        },
        type: QueryTypes.SELECT,
      },
    );
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ trigger_name: '0x36bc022fc662d7ff' });
  });
  it('support enum drop and enum creation', async () => {
    const cid = 'QmR8LS4vAh9Lj3p38h7AR9XDB9xf563Lc4zpE5sPZPpKbH';
    schemaName = 'test-migrations-17';
    app = await prepareApp(schemaName, cid, false, false);

    projectService = app.get('IProjectService');
    const projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();
    await projectService.init(1);
    tempDir = (projectService as any).project.root;

    await projectUpgradeService.setCurrentHeight(2000);

    const result = await sequelize.query(
      `
      SELECT
       t.typname AS enum_type,
       e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = :schema -- Replace 'public' with your schema name if different
ORDER BY t.typname, e.enumsortorder;`,
      { type: QueryTypes.SELECT, replacements: { schema: schemaName } },
    );

    expect(result.length).toBe(5);
    expect(result.find((e: any) => e.enum_type === '5fcf5d7ab8')).toEqual({
      enum_type: '5fcf5d7ab8',
      enum_value: 'CREATED',
    });
    expect(
      result.find((e: any) => e.enum_type === 'e9b7360cdc'),
    ).toBeUndefined();
  });
});
