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
  NodeConfig,
  PoiService,
  PoiSyncService,
  ProjectUpgradeSevice,
  SchemaMigrationService,
  StoreCacheService,
  StoreService,
} from '@subql/node-core';
import { generateIndexName } from '@subql/node-core/utils/sequelizeUtil';
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

const PROJECT_CID = 'QmXeJgBMhKPYqTy18mUTVph98taDPRhkdjdGKSDRryaK1V';
const TEST_SCHEMA_NAME = 'test-migration';

async function prepareProjectModule(
  cid: string,
  sequelize: Sequelize,
  tempDirChild: string,
  tempDirParent: string,
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
          dbSchema: `${TEST_SCHEMA_NAME}`,
          subquery: `ipfs://${cid}`,
          ipfs: 'https://unauthipfs.subquery.network/ipfs/api/v0',
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

  return module.createNestApplication();
}

jest.setTimeout(900000);
describe('SchemaMigration integration tests', () => {
  let app: INestApplication;
  let schemaMigrationService: SchemaMigrationService;
  let projectUpgradeService: ProjectUpgradeSevice;
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
    tempDirChild = await makeTempDir();
    tempDirParent = await makeTempDir();
  });

  afterEach(async () => {
    await sequelize.query(`DROP schema "test-migration" cascade;`);
    await promisify(rimraf)(tempDirChild);
    await promisify(rimraf)(tempDirParent);
    // drop schema after
  });

  it('Migrate basic schema w/o indexes', async () => {
    // Expect schema to be of QmdjcBRUYtieZ4Gtj2C7nF9AfdHJVJcmTJ2wfr8c54WydQ
    app = await prepareProjectModule(
      PROJECT_CID,
      sequelize,
      tempDirChild,
      tempDirParent,
    );
    await app.init();

    projectService = app.get('IProjectService');
    projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();

    await projectService.init(500);

    await projectUpgradeService.init(
      {} as any,
      new SchemaMigrationService(sequelize),
    );
    const dbResults = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='${TEST_SCHEMA_NAME}';`,
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
      `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = '${TEST_SCHEMA_NAME}' AND table_name = 'accounts';`,
      { type: QueryTypes.SELECT },
    );
    const firstTransferBlockColumn = accountColumns.find(
      (row: { column_name: string; is_nullable: string }) =>
        row.column_name === 'first_transfer_block',
    ) as { column_name: string; is_nullable: string };
    expect(firstTransferBlockColumn).toBeDefined();
    expect(firstTransferBlockColumn.is_nullable).toEqual('YES'); // 'YES' for nullable in SQL standard

    // TODO
    // Check if testEntity has all the historical fields and historical index
    const [columnResult] = await sequelize.query(
      `SELECT
                column_name,
                data_type,
                is_nullable
            FROM
                information_schema.columns
            WHERE
                table_schema = '${TEST_SCHEMA_NAME}'
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
                  schemaname = '${TEST_SCHEMA_NAME}'
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
    const fields = (indexOptions.fields ?? []).join('_');
    const expectIndexName = blake2AsHex(`TestEntity_${fields}`, 64).substring(
      0,
      63,
    );

    expect(indexResult).toStrictEqual([
      {
        indexname: 'test_entities_pkey',
        indexdef:
          'CREATE UNIQUE INDEX test_entities_pkey ON "test-migration".test_entities USING btree (_id)',
      },
      {
        indexname: expectIndexName,
        indexdef:
          'CREATE INDEX "0x4eda71e3658b726f" ON "test-migration".test_entities USING btree (id)',
      },
    ]);

    // Create new tables should include historical columns
    // Check for test_field to be removed
    // expect(accountsColumnNames).not.toContain('test_field');
    // ensure correct historical indexes are created
  });
  it('Ensure correct JSON field creation with nested json', async () => {
    // parent: QmZjRiNanU5KXqAvHtBLHqLwMWRLwppc6WTmXYzCrRbjgi
    // child: QmQZgpfWNnEXDkLwXNPB4XY65pB4C8qz7cPKLsqnxrer7J
    const jsonCid = 'QmQZgpfWNnEXDkLwXNPB4XY65pB4C8qz7cPKLsqnxrer7J';
    app = await prepareProjectModule(
      jsonCid,
      sequelize,
      tempDirChild,
      tempDirParent,
    );

    await app.init();

    projectService = app.get('IProjectService');
    projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);
    await apiService.init();

    await projectService.init(500);

    await projectUpgradeService.init(
      {} as any,
      new SchemaMigrationService(sequelize),
    );

    const dbResults = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='${TEST_SCHEMA_NAME}';`,
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
          WHERE table_schema = 'test-migration'
            AND table_name = 'test_entity_threes'
            AND column_name = 'example_field';
        `,
      { type: QueryTypes.SELECT },
    );
    expect((exampleFieldColumn as any).data_type).toEqual('jsonb');
  });
  it('Migrate should not rewind if unfinalized is enabled', async () => {
    //
  });
  it('Migration fails on ENUM introduction', async () => {
    // parent: QmQfwp2Zc7rcS9ktboKPXn7cFhc9QCuKkQdoEnzKUnBgr1
    // child: Qmb2VFxMqCSS6Bwvkh96rYtfPuueU3Kz3ngr7pbb8h5kst
    const originalExit = process.exit;
    // Mock process.exit
    (process.exit as any) = jest.fn();

    const enumCid = 'Qmb2VFxMqCSS6Bwvkh96rYtfPuueU3Kz3ngr7pbb8h5kst';
    app = await prepareProjectModule(
      enumCid,
      sequelize,
      tempDirChild,
      tempDirParent,
    );
    await app.init();

    projectService = app.get('IProjectService');
    projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);
    await apiService.init();

    const migrationService = new SchemaMigrationService(sequelize);

    // TODO SpyOn on logger
    const loggerSpy = jest.spyOn((migrationService as any).logger, 'error');

    await projectService.init(500);
    expect(process.exit).toHaveBeenCalledWith(1);
    process.exit = originalExit;
  });
  it('Migration fails on Relational creation and removal', async () => {
    // parent: QmXc3cH6BnXFEyiuJmbWZZLyz6E2e8B8RukrLeBS1Q21T6
    // child (removed relation and create new relation): QmVTcEZbMopEi7VLzBiYStvT18dG6xXEhkFxGUNmHhSppg

    const relationCid = 'QmVTcEZbMopEi7VLzBiYStvT18dG6xXEhkFxGUNmHhSppg';
    app = await prepareProjectModule(
      relationCid,
      sequelize,
      tempDirChild,
      tempDirParent,
    );
    await app.init();

    projectService = app.get('IProjectService');
    projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();

    await projectService.init(500);

    await projectUpgradeService.init(
      {} as any,
      new SchemaMigrationService(sequelize),
    );
  });
});
