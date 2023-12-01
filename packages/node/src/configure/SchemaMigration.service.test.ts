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
import { QueryTypes, Sequelize } from '@subql/x-sequelize';
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

    const childReader = await reader(PROJECT_CID);

    const project = await SubqueryProject.create(
      `${PROJECT_CID}`,
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
            dbSchema: 'TEST_SCHEMA_NAME',
            subquery: `ipfs://${PROJECT_CID}`,
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

    app = module.createNestApplication();
    await app.init();

    projectService = app.get('IProjectService');
    projectUpgradeService = app.get('IProjectUpgradeService');
    const apiService = app.get(ApiService);

    await apiService.init();
  });

  afterAll(async () => {
    await promisify(rimraf)(tempDirChild);
    await promisify(rimraf)(tempDirParent);
    // drop schema after
  });

  it('Migrate basic schema w/o indexes', async () => {
    // Expect schema to be of QmdjcBRUYtieZ4Gtj2C7nF9AfdHJVJcmTJ2wfr8c54WydQ
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

    // Check for test_field to be removed
    // expect(accountsColumnNames).not.toContain('test_field');
  });
  it('Migrate should not rewind if unfinalized is enabled', async () => {
    //
  });
  it('Migration fails on ENUM introduction', async () => {
    //
  });
  it('Migration fails on Relational introduction', async () => {
    //
  });
  it('Migration fails on JSON introduction', async () => {
    //
  });
});
