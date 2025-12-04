// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {delay} from '@subql/common';
import {NodeConfig} from '@subql/node-core/configure';
import {Sequelize} from '@subql/x-sequelize';
import {Exporter} from './exporters';
import {BaseEntity} from './model';
import {PlainStoreModelService} from './storeModel.service';

type TestEntity = BaseEntity & {field1: string};

jest.mock('@subql/x-sequelize', () => {
  const mSequelize = {
    authenticate: jest.fn(),
    Op: {
      in: jest.fn(),
      notIn: jest.fn(),
    },
    define: () => ({
      findOne: jest.fn(),
      create: (input: any) => input,
    }),
    query: () => [{nextval: 1}],
    showAllSchemas: () => ['subquery_1'],
    model: (entity: string) => ({
      upsert: jest.fn(),
      associations: [{}, {}],
      count: 5,
      findAll: jest.fn(() => [
        {
          toJSON: () => ({
            id: 'apple-05-sequelize',
            field1: 'set apple at block 5 with sequelize',
          }),
        },
      ]),
      bulkCreate: jest.fn(),
      destroy: jest.fn(),
      getAttributes: jest.fn(() => ({})),
    }),
    sync: jest.fn(),
    transaction: () => ({
      commit: jest.fn(() => delay(1)), // Delay of 1s is used to test whether we wait for cache to flush
      rollback: jest.fn(),
      afterCommit: jest.fn(),
    }),
    // createSchema: jest.fn(),
  };
  const actualSequelize = jest.requireActual('@subql/x-sequelize');
  return {
    ...actualSequelize,
    Sequelize: jest.fn(() => mSequelize),
  };
});

const errorExporter = {
  export: () => {
    return Promise.reject(new Error('Cant export'));
  },
  shutdown: () => Promise.resolve(),
} satisfies Exporter;

describe('StoreModelService', () => {
  let modelService: PlainStoreModelService;

  const sequelize = new Sequelize();
  const nodeConfig = {} as NodeConfig;

  beforeEach(() => {
    modelService = new PlainStoreModelService(sequelize, nodeConfig);
    modelService.init(false, {findByPk: () => Promise.resolve({toJSON: () => 1})} as any, undefined);
  });

  it('aborts the transaction if an exporter fails', async () => {
    const entity1Model = modelService.getModel<TestEntity>('entity1');
    const tx = await sequelize.transaction();

    (modelService as any).addExporter(entity1Model, errorExporter);

    for (let i = 0; i < 5; i++) {
      await entity1Model.set(
        `entity1_id_0x0${i}`,
        {
          id: `entity1_id_0x0${i}`,
          field1: 'set at block 1',
        },
        1,
        tx
      );
    }

    await expect(() => modelService.applyPendingChanges(1, false, tx)).rejects.toThrow('Cant export');
  });
});
