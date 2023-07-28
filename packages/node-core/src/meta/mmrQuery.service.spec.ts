// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {delay} from '@subql/common';
import {MmrQueryService, PgMmrQueryDb} from '@subql/node-core';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../configure/NodeConfig';

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
      sync: jest.fn(),
      findByPk: () => undefined,
    }),
    query: (input: string, option: any) => {
      if (input === 'SELECT schema_name FROM information_schema.schemata') {
        return [{schema_name: 'testSchema'}];
      }
    },
    showAllSchemas: () => ['subquery_1'],
    model: (entity: string) => ({
      upsert: jest.fn(),
      associations: [{}, {}],
      count: 5,
      bulkCreate: jest.fn(),
      destroy: jest.fn(),
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
    Sequelize: jest.fn(() => mSequelize),
    DataTypes: actualSequelize.DataTypes,
    QueryTypes: actualSequelize.QueryTypes,
    Deferrable: actualSequelize.Deferrable,
  };
});

jest.setTimeout(200000);

describe('mmrQuery', () => {
  const sequilize = new Sequelize();
  const nodeConfig: NodeConfig = {mmrStoreType: 'postgres', dbSchema: 'testSchema'} as any;

  it('mmrQuery should always read leafLength from db', async () => {
    const mmrQuery = new MmrQueryService(nodeConfig, sequilize);
    (mmrQuery as any)._db = await PgMmrQueryDb.create(sequilize, 'testSchema');
    await mmrQuery.init(0);
    const mmrIndexValueStore = (mmrQuery as any)._db.mmrIndexValueStore;
    const spyDbGet = jest.spyOn(mmrIndexValueStore, 'findByPk');
    await mmrQuery.mmrDb.getLeafLength();
    // read again
    await mmrQuery.mmrDb.getLeafLength();
    // total read twice
    expect(spyDbGet).toBeCalledTimes(2);
    expect(spyDbGet).toHaveBeenLastCalledWith(-1);
  });
});
