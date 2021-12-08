// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Test } from '@nestjs/testing';
import { ProjectManifestVersioned } from '@subql/common';
import { Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { DbModule } from '../db/db.module';
import { SubqueryRepo } from '../entities';
import { IndexerManager } from './indexer.manager';

function testSubqueryProject(endpoint: string): SubqueryProject {
  const project = new SubqueryProject(
    new ProjectManifestVersioned({
      specVersion: '0.0.1',
      network: {
        endpoint,
        types: {
          TestType: 'u32',
        },
      },
      dataSources: [],
    } as any),
    '',
  );
  return project;
}

const prepare = async (): Promise<IndexerManager> => {
  const module = await Test.createTestingModule({
    providers: [
      {
        provide: SubqueryProject,
        useFactory: () => testSubqueryProject(''),
      },
      {
        provide: IndexerManager,
        useFactory: (
          sequelize: Sequelize,
          project: SubqueryProject,
          subqueryRepo: SubqueryRepo,
        ) => {
          const indexerManager = new IndexerManager(
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            sequelize,
            project,
            undefined,
            undefined,
            undefined,
            subqueryRepo,
            undefined,
          );
          return indexerManager;
        },
        inject: [Sequelize, SubqueryProject, 'Subquery'],
      },
    ],
    imports: [
      DbModule.forRoot({
        host: process.env.DB_HOST ?? '127.0.0.1',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        username: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASS ?? 'postgres',
        database: process.env.DB_DATABASE ?? 'postgres',
      }),
      DbModule.forFeature(['Subquery']),
    ],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app.get(IndexerManager);
};

function prepareProject(
  name: string,
  dbSchema: string,
  nextBlockHeight: number,
) {
  return {
    name,
    dbSchema,
    hash: '0x',
    nextBlockHeight,
    network: 'test',
    networkGenesis: '0x1234',
  };
}

const TEST_PROJECT = 'test-user/TEST_PROJECT';

describe('IndexerManager Integration Tests', () => {
  let indexerManager: IndexerManager;
  let subqueryRepo: SubqueryRepo;

  async function createSchema(name: string): Promise<void> {
    await subqueryRepo.sequelize.createSchema(`"${name}"`, undefined);
  }

  async function checkSchemaExist(schema: string): Promise<boolean> {
    const schemas = await subqueryRepo.sequelize.showAllSchemas(undefined);
    return (schemas as unknown as string[]).includes(schema);
  }

  beforeAll(async () => {
    indexerManager = await prepare();
    subqueryRepo = (indexerManager as any).subqueryRepo;
  });

  beforeEach(async () => {
    delete (indexerManager as any).nodeConfig;
    await subqueryRepo.destroy({ where: { name: TEST_PROJECT } });
    await subqueryRepo.sequelize.dropSchema(`"${TEST_PROJECT}"`, undefined);
  });

  it("read existing project's schema from subqueries table", async () => {
    const schemaName = 'subql_99999';
    (indexerManager as any).nodeConfig = new NodeConfig({
      subquery: '/test/dir/test-query-project',
      subqueryName: TEST_PROJECT,
    });

    await subqueryRepo.create(prepareProject(TEST_PROJECT, schemaName, 1));

    await expect(
      (indexerManager as any).getExistingProjectSchema(),
    ).resolves.toBe(schemaName);
  });

  it("read existing project's schema from nodeConfig", async () => {
    (indexerManager as any).nodeConfig = new NodeConfig({
      subquery: '/test/dir/test-query-project',
      subqueryName: TEST_PROJECT,
    });

    await createSchema(TEST_PROJECT);
    await subqueryRepo.create(prepareProject(TEST_PROJECT, 'subql_99999', 1));

    await expect(
      (indexerManager as any).getExistingProjectSchema(),
    ).resolves.toBe(TEST_PROJECT);
  });

  it("read existing project's schema when --local", async () => {
    (indexerManager as any).nodeConfig = new NodeConfig({
      subquery: '/test/dir/test-query-project',
      subqueryName: TEST_PROJECT,
      localMode: true,
    });
    await createSchema(TEST_PROJECT);
    await subqueryRepo.create(prepareProject(TEST_PROJECT, 'subql_99999', 1));

    await expect(
      (indexerManager as any).getExistingProjectSchema(),
    ).resolves.toBe('public');
  });

  it('create project schema', async () => {
    (indexerManager as any).nodeConfig = new NodeConfig({
      subquery: '/test/dir/test-query-project',
      subqueryName: TEST_PROJECT,
    });
    await expect((indexerManager as any).createProjectSchema()).resolves.toBe(
      TEST_PROJECT,
    );
    await expect(checkSchemaExist(TEST_PROJECT)).resolves.toBe(true);
  });
});
