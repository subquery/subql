// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {promisify} from 'util';
import {INestApplication} from '@nestjs/common';
import {Test, TestingModule} from '@nestjs/testing';
import {makeTempDir, ReaderFactory} from '@subql/common';
import {
  DbModule,
  DbOption,
  delay,
  getLogger,
  NodeConfig,
  ProjectUpgradeSevice,
  registerApp,
  SchemaMigrationService,
} from '@subql/node-core';
import {ConfigureModule} from '@subql/node/dist/configure/configure.module';
import {SubqueryProject} from '@subql/node/dist/configure/SubqueryProject';
import {yargsOptions} from '@subql/node/dist/yargs';
import {Sequelize} from '@subql/x-sequelize';
import {isNil, omitBy} from 'lodash';
import rimraf from 'rimraf';

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

describe('SchemaMigration integration tests', () => {
  let app: INestApplication;
  let schemaMigrationService: SchemaMigrationService;
  let projectUpgradeService: ProjectUpgradeSevice;
  let sequelize: Sequelize;
  let tempDirParent: string;
  let tempDirChild: string;

  beforeAll(async () => {
    // const dbModule = DbModule.forRoot()
    // const mockYargs = (yargsOptions as unknown as jest.Mock).mockImplementation(()=> {
    //   return {
    //       subquery: 'QmXi4TbzA1Ti9B2f5YU86pTTfzYSjNRrkSK6Jiej73o6rw',
    //       ipfs: 'https://unauthipfs.subquery.network/ipfs/api/v0',
    //       'db-schema': 'test-schema',
    //       'network-endpoint': ''
    //   }
    // })
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();
    tempDirChild = await makeTempDir();
    tempDirParent = await makeTempDir();

    const childReader = await reader('QmXi4TbzA1Ti9B2f5YU86pTTfzYSjNRrkSK6Jiej73o6rw');

    const project = await SubqueryProject.create(
      'ipfs://' + 'QmXi4TbzA1Ti9B2f5YU86pTTfzYSjNRrkSK6Jiej73o6rw',
      await childReader.getProjectSchema(),
      childReader,
      tempDirChild,
      {
        endpoint: ['wss://rpc.polkadot.io/public-ws'],
      }
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProjectUpgradeSevice,
          useFactory: () => {
            return ProjectUpgradeSevice.create(project, async (cid: string): Promise<any> => {
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
                  isNil
                )
              );
            });
          },
        },
        // ProjectService to init the dbSchema?
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    projectUpgradeService = app.get(ProjectUpgradeSevice);
    await projectUpgradeService.init({} as any, new SchemaMigrationService(sequelize));
  });

  afterAll(async () => {
    await promisify(rimraf)(tempDirChild);
    await promisify(rimraf)(tempDirParent);
  });

  it('Migrate basic schema w/o indexes', async () => {
    // parent CID: QmdjcBRUYtieZ4Gtj2C7nF9AfdHJVJcmTJ2wfr8c54WydQ
    // child CID: QmXi4TbzA1Ti9B2f5YU86pTTfzYSjNRrkSK6Jiej73o6rw
    // Schema differences
    // added new entity, test Entity two
    // Removed fieldTwo on testEntity
    // Added column fieldThree on testEntity
    // update field one to non-null
    // initialize projectUpgrade
    // await ProjectUpgradeService.create()
  });
});
