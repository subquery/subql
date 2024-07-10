// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {readFileSync} from 'fs';
import * as path from 'path';
import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {buildSchemaFromString} from '@subql/utils';
import {IndexesOptions, QueryTypes, Sequelize} from '@subql/x-sequelize';
import {GraphQLSchema} from 'graphql';
import {NodeConfig} from '../../configure';
import {ISubqueryProject, StoreCacheService, StoreService} from '../../indexer';
import {initDbSchema} from '../../utils/project';
import {DbOption} from '../db.module';
import {generateHashedIndexName} from '../sync-helper';
import {SchemaMigrationService} from './SchemaMigration.service';

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

async function setup(
  schemaName: string,
  initialSchema: GraphQLSchema,
  sequelize: Sequelize,
  config = new NodeConfig({} as any)
): Promise<SchemaMigrationService> {
  const project = {
    schema: initialSchema,
    network: {
      chainId: 'chainId',
    },
  } as unknown as ISubqueryProject;

  const storeCache = new StoreCacheService(sequelize, config, new EventEmitter2(), new SchedulerRegistry());

  const storeService = new StoreService(sequelize, config, storeCache, project);

  await sequelize.createSchema(`"${schemaName}"`, {});

  await storeService.initCoreTables(schemaName);
  await initDbSchema(schemaName, storeService);

  return new SchemaMigrationService(
    sequelize,
    storeService,
    storeCache._flushCache.bind(storeCache),
    schemaName,
    config
  );
}

function loadGqlSchema(fileName: string): GraphQLSchema {
  return buildSchemaFromString(
    readFileSync(path.resolve(__dirname, `../../../test/migration-schemas/${fileName}`)).toString('utf8')
  );
}

jest.setTimeout(900000);
describe('SchemaMigration integration tests', () => {
  let sequelize: Sequelize;
  let schemaName: string;

  beforeEach(async () => {
    // Need to create a new instance for each test because sequelize keeps reference to modle instances
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();
  });

  afterEach(async () => {
    await sequelize.dropSchema(schemaName, {logging: false});
    await sequelize?.close();
  });

  it('Migrate to new schema', async () => {
    schemaName = 'test-migrations-1';
    const initialSchema = loadGqlSchema('test_1_1.graphql');

    const migrationService = await setup(schemaName, initialSchema, sequelize);

    await migrationService.run(initialSchema, loadGqlSchema('test_1_1000.graphql'));

    const dbResults = await sequelize.query<string[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='${schemaName}';`,
      {type: QueryTypes.SELECT}
    );
    const tableNames = dbResults.map((row) => row[0]);

    expect(tableNames).toContain('_metadata');
    expect(tableNames).toContain('accounts');
    expect(tableNames).not.toContain('test_entities');
    expect(tableNames).toContain('transfers');
    expect(tableNames).toContain('test_entity_twos');

    // Query to check the structure of 'accounts' table
    const accountColumns = await sequelize.query<{column_name: string; is_nullable: string}>(
      `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = :schema AND table_name = :table ;`,
      {
        type: QueryTypes.SELECT,
        replacements: {schema: schemaName, table: 'accounts'},
      }
    );
    const firstTransferBlockColumn = accountColumns.find((row) => row.column_name === 'first_transfer_block');
    expect(firstTransferBlockColumn).toBeDefined();
    expect(firstTransferBlockColumn?.is_nullable).toEqual('YES');

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
        replacements: {schema: schemaName},
      }
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
        replacements: {schema: schemaName},
      }
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
    const expectIndexName = generateHashedIndexName('TestEntityTwo', indexOptions);

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
    schemaName = 'test-migrations-2';
    const initialSchema = loadGqlSchema('test_2_1.graphql');
    const migrationService = await setup(schemaName, initialSchema, sequelize);

    await migrationService.run(initialSchema, loadGqlSchema('test_2_1000.graphql'));

    const [exampleFieldColumn] = await sequelize.query<{data_type: string}>(
      `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = '${schemaName}'
            AND table_name = 'test_entities'
            AND column_name = 'example_field';
        `,
      {type: QueryTypes.SELECT}
    );
    expect(exampleFieldColumn.data_type).toEqual('jsonb');
  });

  it('Migration on index removal, creation', async () => {
    schemaName = 'test-migrations-5';

    const initialSchema = loadGqlSchema('test_5_1.graphql');
    const migrationService = await setup(schemaName, initialSchema, sequelize);

    await migrationService.run(initialSchema, loadGqlSchema('test_5_1000.graphql'));

    const indexResult = await sequelize.query<{indexname: string; indexdef: string}>(
      `SELECT
                  indexname,
                  indexdef
              FROM
                  pg_indexes
              WHERE
                  schemaname = :schema ;`,
      {
        type: QueryTypes.SELECT,
        replacements: {schema: schemaName},
      }
    );
    const findIndex = (modelName: string, unique: boolean, fields: string[]) =>
      indexResult.find((i) => i.indexname === generateHashedIndexName(modelName, {unique, fields}));

    const uniqueIndex = findIndex('NewIndexOne', true, ['name', '_block_range']);
    const nonUniqueIndex = findIndex('NewIndexTwo', false, ['name', '_block_range']);
    const compositeIndex = findIndex('NewIndexComposite', false, ['block', 'block_two', '_block_range']);
    const droppedUniqueIndex = findIndex('DropSingleIndex', true, ['example_field', '_block_range']);
    const droppedCompositeIndex = findIndex('DropCompositeIndex', false, ['block', 'block_two', '_block_range']);

    expect(uniqueIndex).toBeTruthy();
    expect(nonUniqueIndex).toBeTruthy();
    expect(compositeIndex).toBeTruthy();

    expect(droppedCompositeIndex).toBe(undefined);
    expect(droppedUniqueIndex).toBe(undefined);
  });

  it('Ensure correctness on non-historical migrate', async () => {
    schemaName = 'test-migrations-10';

    const initialSchema = loadGqlSchema('test_10_1.graphql');
    const migrationService = await setup(
      schemaName,
      initialSchema,
      sequelize,
      new NodeConfig({disableHistorical: true} as any)
    );

    await migrationService.run(initialSchema, loadGqlSchema('test_10_1000.graphql'));

    const results = await sequelize.query<{column_name: string}>(
      `SELECT
                column_name
            FROM
                information_schema.columns
            WHERE
                table_schema = :schema
                AND table_name = 'test_entity_twos'`,
      {
        type: QueryTypes.SELECT,
        replacements: {schema: schemaName},
      }
    );

    expect(results.find((c) => c.column_name === '_block_range')).not.toBeDefined();
  });

  it('On Failed migration, no metadata transaction should be applied', async () => {
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementationOnce((() => {
      throw new Error();
    }) as any);

    schemaName = 'test-migrations-11';

    const initialSchema = loadGqlSchema('test_11_1.graphql');
    const migrationService = await setup(schemaName, initialSchema, sequelize);

    await expect(migrationService.run(initialSchema, loadGqlSchema('test_11_2000.graphql'))).rejects.toThrow();

    // expect(processExitSpy).toHaveBeenCalledTimes(1);
    // expect(processExitSpy).toHaveBeenCalledWith(1);

    const [result] = await sequelize.query(
      `SELECT * FROM "${schemaName}"._metadata WHERE key = 'lastProcessedHeight'`,
      {type: QueryTypes.SELECT}
    );

    expect(result).toBe(undefined);

    processExitSpy.mockRestore();
  });

  it('add relations on migration with historical', async () => {
    schemaName = 'test-migrations-12';

    const initialSchema = loadGqlSchema('test_12_1.graphql');
    const migrationService = await setup(schemaName, initialSchema, sequelize);

    await migrationService.run(initialSchema, loadGqlSchema('test_12_2000.graphql'));

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
        replacements: {schema: schemaName},
      }
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
    schemaName = 'test-migrations-13';

    const initialSchema = loadGqlSchema('test_13_1.graphql');
    const migrationService = await setup(
      schemaName,
      initialSchema,
      sequelize,
      new NodeConfig({disableHistorical: true} as any)
    );

    await migrationService.run(initialSchema, loadGqlSchema('test_13_2000.graphql'));

    const result = await sequelize.query(
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
        type: QueryTypes.SELECT,
        replacements: {schema: schemaName},
      }
    );

    expect(result.length).toBe(6);
  });

  it('drop relational with no historical', async () => {
    schemaName = 'test-migrations-14';

    const initialSchema = loadGqlSchema('test_14_1.graphql');
    const migrationService = await setup(
      schemaName,
      initialSchema,
      sequelize,
      new NodeConfig({disableHistorical: true} as any)
    );

    await migrationService.run(initialSchema, loadGqlSchema('test_14_1000.graphql'));

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

    expect(result.length).toBe(0);
  });

  it('Able to drop table and column with relations', async () => {
    schemaName = 'test-migrations-15';

    const initialSchema = loadGqlSchema('test_15_1.graphql');
    const migrationService = await setup(schemaName, initialSchema, sequelize);

    await migrationService.run(initialSchema, loadGqlSchema('test_15_2000.graphql'));

    await migrationService.run(initialSchema, loadGqlSchema('test_15_4000.graphql'));

    const result = await sequelize.query<{table_name: string}>(
      `SELECT table_name
FROM information_schema.tables
WHERE table_schema = :schema
`,
      {
        replacements: {schema: schemaName},
        type: QueryTypes.SELECT,
      }
    );
    expect(result.length).toBe(4);
    expect(result).not.toContain({table_name: 'accounts'});
  });

  it('create subscription on table creation', async () => {
    schemaName = 'test-migrations-16';

    const initialSchema = loadGqlSchema('test_16_1.graphql');
    const migrationService = await setup(
      schemaName,
      initialSchema,
      sequelize,
      new NodeConfig({subscription: true} as any)
    );

    await migrationService.run(initialSchema, loadGqlSchema('test_16_2000.graphql'));

    const result = await sequelize.query<{trigger_name: string}>(
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
      }
    );
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({trigger_name: '0x36bc022fc662d7ff'});
  });

  it('support enum drop and enum creation', async () => {
    schemaName = 'test-migrations-17';

    const initialSchema = loadGqlSchema('test_17_1.graphql');
    const migrationService = await setup(schemaName, initialSchema, sequelize);

    await migrationService.run(initialSchema, loadGqlSchema('test_17_2000.graphql'));

    const result = await sequelize.query<{enum_type: string; enum_value: string}>(
      `
      SELECT
       t.typname AS enum_type,
       e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = :schema -- Replace 'public' with your schema name if different
ORDER BY t.typname, e.enumsortorder;`,
      {type: QueryTypes.SELECT, replacements: {schema: schemaName}}
    );

    expect(result.length).toBe(5);
    expect(result.find((e) => e.enum_type === '5fcf5d7ab8')).toEqual({
      enum_type: '5fcf5d7ab8',
      enum_value: 'CREATED',
    });
    expect(result.find((e) => e.enum_type === 'e9b7360cdc')).toBeUndefined();
  });
});
