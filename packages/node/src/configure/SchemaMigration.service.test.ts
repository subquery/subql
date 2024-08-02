// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { INestApplication } from '@nestjs/common';
import { DbOption, StoreCacheService } from '@subql/node-core';
import { QueryTypes, Sequelize } from '@subql/x-sequelize';
import { rimraf } from 'rimraf';
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
    await rimraf(tempDir);
    await sequelize?.close();
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

    const dbResults = await sequelize.query<string[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema= :schema;`,
      { type: QueryTypes.SELECT, replacements: { schema: schemaName } },
    );
    const tableNames: string[] = dbResults.map((row) => {
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
      'Transfer',
      'Account',
      'AddedEntity',
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

    expect(cacheSpy).toHaveBeenCalledTimes(2);
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

    expect(Object.keys(cachedModels)).toStrictEqual([
      '_metadata',
      'Transfer',
      'Account',
    ]);
  });
});
