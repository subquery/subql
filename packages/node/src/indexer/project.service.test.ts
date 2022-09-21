// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Test } from '@nestjs/testing';
import {
  SubqueryRepo,
  DbModule,
  NodeConfig,
  getExistingProjectSchema,
} from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { Sequelize } from 'sequelize';
import { ConfigureModule } from '../configure/configure.module';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ProjectService } from './project.service';

function testSubqueryProject(): SubqueryProject {
  return {
    network: {
      endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
      dictionary: `https://api.subquery.network/sq/subquery/dictionary-polkadot`,
    },
    dataSources: [],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  };
}
const TEST_PROJECT = 'test-user/TEST_PROJECT';
const nodeConfig = new NodeConfig({
  subquery: 'packages/node/test/projectFixture/v1.0.0',
  subqueryName: TEST_PROJECT,
});

const prepare = async (): Promise<ProjectService> => {
  const module = await Test.createTestingModule({
    providers: [
      {
        provide: SubqueryProject,
        useFactory: () => testSubqueryProject(),
      },
      {
        provide: ProjectService,
        useFactory: (
          sequelize: Sequelize,
          project: SubqueryProject,
          subqueryRepo: SubqueryRepo,
          nodeConfig: NodeConfig,
        ) =>
          new ProjectService(
            undefined,
            undefined,
            undefined,
            undefined,
            sequelize,
            project,
            undefined,
            nodeConfig,
            undefined,
            subqueryRepo,
            undefined,
          ),
        inject: [Sequelize, SubqueryProject, 'Subquery', NodeConfig],
      },
    ],
    imports: [
      ConfigureModule.registerWithConfig(nodeConfig),
      DbModule.forRoot(),
      DbModule.forFeature(['Subquery']),
    ],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app.get(ProjectService);
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

describe('ProjectService Integration Tests', () => {
  let projectService: ProjectService;
  let subqueryRepo: SubqueryRepo;
  let logger: any;

  async function createSchema(name: string): Promise<void> {
    await subqueryRepo.sequelize.createSchema(`"${name}"`, undefined);
  }

  async function checkSchemaExist(schema: string): Promise<boolean> {
    const schemas = await subqueryRepo.sequelize.showAllSchemas(undefined);
    return (schemas as unknown as string[]).includes(schema);
  }

  beforeAll(async () => {
    projectService = await prepare();
    subqueryRepo = (projectService as any).subqueryRepo;
  });

  beforeEach(async () => {
    await subqueryRepo.destroy({ where: { name: TEST_PROJECT } });
    await subqueryRepo.sequelize.dropSchema(`"${TEST_PROJECT}"`, undefined);
  });

  it("read existing project's schema from subqueries table", async () => {
    const schemaName = 'subql_99999';
    await subqueryRepo.create(prepareProject(TEST_PROJECT, schemaName, 1));

    const schema = getExistingProjectSchema(
      (projectService as any).nodeConfig,
      (projectService as any).sequelize,
      (projectService as any).subqueryRepo,
    );
    await expect(schema).resolves.toBe(schemaName);
  });

  it("read existing project's schema from nodeConfig", async () => {
    await createSchema(TEST_PROJECT);
    await subqueryRepo.create(prepareProject(TEST_PROJECT, 'subql_99999', 1));

    const schema = getExistingProjectSchema(
      (projectService as any).nodeConfig,
      (projectService as any).sequelize,
      (projectService as any).subqueryRepo,
    );

    await expect(schema).resolves.toBe(TEST_PROJECT);
  });

  it('create project schema', async () => {
    await expect((projectService as any).createProjectSchema()).resolves.toBe(
      TEST_PROJECT,
    );
    await expect(checkSchemaExist(TEST_PROJECT)).resolves.toBe(true);
  });

  it("read existing project's schema when --local", async () => {
    (projectService as any).nodeConfig = new NodeConfig({
      subquery: '/test/dir/test-query-project',
      subqueryName: TEST_PROJECT,
      localMode: true,
    });
    await createSchema(TEST_PROJECT);
    await subqueryRepo.create(prepareProject(TEST_PROJECT, 'subql_99999', 1));

    const schema = getExistingProjectSchema(
      (projectService as any).nodeConfig,
      (projectService as any).sequelize,
      (projectService as any).subqueryRepo,
    );

    await expect(schema).resolves.toBe('public');
  });
});
