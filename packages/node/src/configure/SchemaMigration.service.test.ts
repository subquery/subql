// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { promisify } from 'util';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { makeTempDir, ReaderFactory } from '@subql/common';
import {
  ConnectionPoolService,
  ConnectionPoolStateManager,
  DbOption,
  generateHashedIndexName,
  NodeConfig,
  PoiService,
  PoiSyncService,
  ProjectUpgradeSevice,
  StoreCacheService,
  StoreService,
} from '@subql/node-core';
import { blake2AsHex } from '@subql/utils';
import { IndexesOptions, QueryTypes, Sequelize } from '@subql/x-sequelize';
import { isNil, omitBy } from 'lodash';
import rimraf from 'rimraf';
import { ApiService } from '../indexer/api.service';
import { DsProcessorService } from '../indexer/ds-processor.service';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { ProjectService } from '../indexer/project.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';
import { SubqueryProject } from './SubqueryProject';

const reader = async (cid: string) => {
  return ReaderFactory.create(`ipfs://${cid}`, {
    ipfs: 'https://unauthipfs.subquery.network/ipfs/api/v0',
  });
};

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

async function prepareProjectModule(
  cid: string,
  sequelize: Sequelize,
  tempDirChild: string,
  tempDirParent: string,
  schemaName: string,
): Promise<INestApplication> {
  const childReader = await reader(cid);

  const project = await SubqueryProject.create(
    `${cid}`,
    await childReader.getProjectSchema(),
    childReader,
    tempDirChild,
    {
      endpoint: ['wss://rpc.polkadot.io/public-ws'],
    },
  );

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      {
        provide: 'IProjectUpgradeService',
        useFactory: () => {
          return ProjectUpgradeSevice.create(
            project,
            async (cid: string): Promise<any> => {
              const loReader = await reader(cid);
              return SubqueryProject.create(
                cid,
                await loReader.getProjectSchema(),
                loReader,
                tempDirParent,
                omitBy(
                  {
                    endpoint: project.network.endpoint,
                    dictionary: project.network.dictionary,
                  },
                  isNil,
                ),
              );
            },
          );
        },
      },
      {
        provide: 'IProjectService',
        useClass: ProjectService,
      },
      {
        provide: NodeConfig,
        useFactory: () => ({
          dbSchema: schemaName,
          subquery: cid,
          ipfs: 'https://unauthipfs.subquery.network/ipfs/api/v0',
          allowSchemaMigration: true,
        }),
      },
      {
        provide: 'ISubqueryProject',
        useValue: project,
      },
      DsProcessorService,
      ApiService,
      ConnectionPoolService,
      ConnectionPoolStateManager,
      EventEmitter2,
      {
        provide: Sequelize,
        useValue: sequelize,
      },
      StoreService,
      StoreCacheService,
      DynamicDsService,
      UnfinalizedBlocksService,
      PoiService,
      PoiSyncService,
    ],
    imports: [EventEmitterModule.forRoot()],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

jest.setTimeout(900000);
describe('SchemaMigration integration tests', () => {
  let app: INestApplication;
  let projectService: ProjectService;
  let sequelize: Sequelize;
  let tempDirParent: string;
  let tempDirChild: string;

  beforeAll(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option,
    );
    await sequelize.authenticate();
  });
  beforeEach(async () => {
    tempDirChild = await makeTempDir();
    tempDirParent = await makeTempDir();
  });

  afterEach(async () => {
    // await sequelize.query(`DROP schema "test-migration" cascade;`);
    await promisify(rimraf)(tempDirChild);
    await promisify(rimraf)(tempDirParent);
    return app?.close();
  });
  afterAll(async () => {
    // await sequelize.dropAllSchemas({})
    await Promise.all([
      sequelize.dropSchema('test-migrations-1', { logging: true }),
      sequelize.dropSchema('test-migrations-2', { logging: true }),
      sequelize.dropSchema('test-migrations-3', { logging: true }),
      sequelize.dropSchema('test-migrations-4', { logging: true }),
      sequelize.dropSchema('test-migrations-5', { logging: true }),
    ]);
  });

  it('Migrate basic schema w/o indexes', async () => {
    // Expect schema to be of QmdjcBRUYtieZ4Gtj2C7nF9AfdHJVJcmTJ2wfr8c54WydQ
    const cid = 'QmXeJgBMhKPYqTy18mUTVph98taDPRhkdjdGKSDRryaK1V';
    const schema = 'test-migrations-1';
    app = await prepareProjectModule(
      cid,
      sequelize,
      tempDirChild,
      tempDirParent,
      schema,
    );

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);

    await apiService.init();

    await projectService.init(500);

    const dbResults = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='${schema}';`,
      { type: QueryTypes.SELECT },
    );
    const tableNames: string[] = dbResults.map((row: string[]) => {
      return row[0];
    });

    expect(tableNames).toContain('_metadata');
    expect(tableNames).toContain('accounts');
    expect(tableNames).toContain('test_entities');
    expect(tableNames).toContain('transfers');
    expect(tableNames).not.toContain('test_entity_twos'); // test_entity_twos should be removed

    // Query to check the structure of 'accounts' table
    const accountColumns = await sequelize.query(
      `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'accounts';`,
      { type: QueryTypes.SELECT },
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
                table_schema = '${schema}'
                AND table_name = 'test_entities'
                AND column_name = '_block_range';`,
    );

    const [indexResult] = await sequelize.query(
      `SELECT
                  indexname,
                  indexdef
              FROM
                  pg_indexes
              WHERE
                  schemaname = '${schema}'
                  AND tablename = 'test_entities';`,
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
      name: 'test_entities_id',
    };
    const expectIndexName = generateHashedIndexName('TestEntity', indexOptions);

    expect(indexResult).toStrictEqual([
      {
        indexname: 'test_entities_pkey',
        indexdef: `CREATE UNIQUE INDEX test_entities_pkey ON "${schema}".test_entities USING btree (_id)`,
      },
      {
        indexname: expectIndexName,
        indexdef: `CREATE INDEX "0x4eda71e3658b726f" ON "${schema}".test_entities USING btree (id)`,
      },
    ]);
  });
  it('Ensure correct JSON field creation with nested json', async () => {
    // parent: QmbqZ1UoRVJ4umb3FByNN2rPYgzHxWKohfeEVnkQakDLgQ
    // child: QmQZgpfWNnEXDkLwXNPB4XY65pB4C8qz7cPKLsqnxrer7J
    const jsonCid = 'QmQZgpfWNnEXDkLwXNPB4XY65pB4C8qz7cPKLsqnxrer7J';
    const schema = 'test-migrations-2';
    app = await prepareProjectModule(
      jsonCid,
      sequelize,
      tempDirChild,
      tempDirParent,
      schema,
    );

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);
    await apiService.init();
    await projectService.init(500);

    const dbResults = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='${schema}';`,
      { type: QueryTypes.SELECT },
    );
    const tableNames: string[] = dbResults.map((row: string[]) => {
      return row[0];
    });
    expect(tableNames).toContain('test_entity_twos'); // test_entity_twos should be removed
    expect(tableNames).not.toContain('new_entities'); // test_entity_twos should be removed

    const [exampleFieldColumn] = await sequelize.query(
      `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = '${schema}'
            AND table_name = 'test_entity_threes'
            AND column_name = 'example_field';
        `,
      { type: QueryTypes.SELECT },
    );
    expect((exampleFieldColumn as any).data_type).toEqual('jsonb');
  });
  it('Migration fails on ENUM introduction', async () => {
    // parent: QmQfwp2Zc7rcS9ktboKPXn7cFhc9QCuKkQdoEnzKUnBgr1
    // child: Qmb2VFxMqCSS6Bwvkh96rYtfPuueU3Kz3ngr7pbb8h5kst

    const enumCid = 'Qmb2VFxMqCSS6Bwvkh96rYtfPuueU3Kz3ngr7pbb8h5kst';
    const schema = 'test-migrations-3';

    app = await prepareProjectModule(
      enumCid,
      sequelize,
      tempDirChild,
      tempDirParent,
      schema,
    );

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);
    await apiService.init();

    await expect(projectService.init(500)).rejects.toThrow(
      'Schema Migration currently does not support Enum removal and creation',
    );
  });
  it('Migration fails on Relational creation and removal', async () => {
    // parent: QmXc3cH6BnXFEyiuJmbWZZLyz6E2e8B8RukrLeBS1Q21T6
    // child (removed relation and create new relation): QmVTcEZbMopEi7VLzBiYStvT18dG6xXEhkFxGUNmHhSppg

    const relationCid = 'QmVTcEZbMopEi7VLzBiYStvT18dG6xXEhkFxGUNmHhSppg';
    const schema = 'test-migrations-4';

    app = await prepareProjectModule(
      relationCid,
      sequelize,
      tempDirChild,
      tempDirParent,
      schema,
    );

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);

    await apiService.init();

    await expect(projectService.init(500)).rejects.toThrow(
      'Schema Migration currently does not support Relational removal or creation',
    );
  });

  it('Migration on index removal, creation', async () => {
    // parent: QmXikuVRr5rKfzC9v6vF8zEywJ8AUhR7MGt44kdZjQgLAg
    // child : QmQ6msxfc8vqeiPwbbJHu9JZyH6e25u2A4YWi8SxpB69KH
    const relationCid = 'QmQ6msxfc8vqeiPwbbJHu9JZyH6e25u2A4YWi8SxpB69KH';
    const schema = 'test-migrations-5';
    app = await prepareProjectModule(
      relationCid,
      sequelize,
      tempDirChild,
      tempDirParent,
      schema,
    );

    projectService = app.get('IProjectService');
    const apiService = app.get(ApiService);

    await apiService.init();

    await projectService.init(500);

    const [indexResult] = await sequelize.query(
      `SELECT
                  indexname,
                  indexdef
              FROM
                  pg_indexes
              WHERE
                  schemaname = '${schema}';`,
    );

    expect(
      indexResult.find(
        (i: any) =>
          i.indexname ===
          generateHashedIndexName('TestIndexOne', {
            unique: true,
            fields: ['name'],
          }),
      ),
    ).toEqual({
      indexname: '0x7cea7dddb66a5475',
      indexdef: `CREATE UNIQUE INDEX "0x7cea7dddb66a5475" ON "${schema}".test_index_ones USING btree (name)`,
    });
    expect(
      indexResult.find(
        (i: any) =>
          i.indexname ===
          generateHashedIndexName('TestIndexTwo', {
            unique: false,
            fields: ['name'],
          }),
      ),
    ).toEqual({
      indexname: '0xc1e1132ee204d92f',
      indexdef: `CREATE INDEX "0xc1e1132ee204d92f" ON "${schema}".test_index_twos USING btree (name)`,
    });
  });
});
