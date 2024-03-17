// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {QueryTypes, Sequelize} from '@subql/x-sequelize';
import {MetadataFactory, MetadataKeys, MetadataRepo} from '../';
import {DbOption} from '../../';
import {CacheMetadataModel} from './cacheMetadata';

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

describe('cacheMetadata integration', () => {
  let sequelize: Sequelize;
  let schema: string;
  let metaDataRepo: MetadataRepo;
  let cacheMetadataModel: CacheMetadataModel;

  beforeAll(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();

    schema = '"metadata-test-1"';
    await sequelize.createSchema(schema, {});
    metaDataRepo = await MetadataFactory(sequelize, schema, false, '1');

    await metaDataRepo.sync();

    cacheMetadataModel = new CacheMetadataModel(metaDataRepo);
  });

  const queryMeta = async <K extends keyof MetadataKeys>(key: K): Promise<MetadataKeys[K] | undefined> => {
    const res = await metaDataRepo.findByPk(key);
    return res?.toJSON()?.value as any;
  };

  const flush = async () => {
    const tx = await sequelize.transaction();
    await cacheMetadataModel.flush(tx);
    await tx.commit();
  };

  afterAll(async () => {
    await sequelize.dropSchema(schema, {logging: false});
    await sequelize.close();
  });

  it('Ensure increment keys are created on _metadata table', async () => {
    // create key at 0
    await (cacheMetadataModel as any).incrementJsonbCount('schemaMigrationCount');

    // increment by 1
    await (cacheMetadataModel as any).incrementJsonbCount('schemaMigrationCount');

    // increase by 100
    await (cacheMetadataModel as any).incrementJsonbCount('schemaMigrationCount', 100);

    const v = await queryMeta('schemaMigrationCount');
    expect(v).toBe(101);
  });

  describe('dynamicDatasources', () => {
    beforeEach(async () => {
      // Ensure value exits so we can update it
      await metaDataRepo.bulkCreate([{key: 'dynamicDatasources', value: []}], {updateOnDuplicate: ['key', 'value']});
    });

    it('Appends dynamicDatasources correctly', async () => {
      cacheMetadataModel.setNewDynamicDatasource({templateName: 'foo', startBlock: 1});
      cacheMetadataModel.setNewDynamicDatasource({templateName: 'bar', startBlock: 2});
      cacheMetadataModel.setNewDynamicDatasource({templateName: 'baz', startBlock: 2});

      const expected = [
        {templateName: 'foo', startBlock: 1},
        {templateName: 'bar', startBlock: 2},
        {templateName: 'baz', startBlock: 2},
      ];

      await flush();

      const v = await queryMeta('dynamicDatasources');
      expect(v).toEqual(expected);

      const cacheV = await cacheMetadataModel.find('dynamicDatasources');
      expect(cacheV).toEqual(expected);
    });

    it('Allows overriding all dynamicDatasources', async () => {
      cacheMetadataModel.setNewDynamicDatasource({templateName: 'foo', startBlock: 1});

      cacheMetadataModel.set('dynamicDatasources', [{templateName: 'bar', startBlock: 2}]);

      await flush();

      const v = await queryMeta('dynamicDatasources');
      expect(v).toEqual([{templateName: 'bar', startBlock: 2}]);
    });

    it('Caches the dynamicDatasources correctly after using set', async () => {
      cacheMetadataModel.setNewDynamicDatasource({templateName: 'foo', startBlock: 1});
      await flush();

      const cacheV = await cacheMetadataModel.find('dynamicDatasources');
      expect(cacheV).toEqual([{templateName: 'foo', startBlock: 1}]);

      cacheMetadataModel.setNewDynamicDatasource({templateName: 'bar', startBlock: 2});
      // await flush();

      const cacheV2 = await cacheMetadataModel.find('dynamicDatasources');
      expect(cacheV2).toEqual([
        {templateName: 'foo', startBlock: 1},
        {templateName: 'bar', startBlock: 2},
      ]);
    });

    it('Uses the correct cache values when using new and set', async () => {
      cacheMetadataModel.setNewDynamicDatasource({templateName: 'foo', startBlock: 1});

      cacheMetadataModel.set('dynamicDatasources', [{templateName: 'bar', startBlock: 2}]);

      const cacheV = await cacheMetadataModel.find('dynamicDatasources');
      expect(cacheV).toEqual([{templateName: 'bar', startBlock: 2}]);
    });
  });
});
