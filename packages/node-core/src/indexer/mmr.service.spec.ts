// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {delay} from '@subql/common';
import {Sequelize} from '@subql/x-sequelize';
import {MetadataRepo, MmrService, MmrStoreType, PgMmrCacheService, ProofOfIndex, StoreCacheService} from '../';

jest.mock('@subql/x-sequelize', () => {
  let data: Record<string, any> = {};

  let pendingData: typeof data = {};
  let afterCommitHooks: Array<() => void> = [];

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

      findByPk: jest.fn(({transaction, where: {id}}) => ({
        toJSON: () => (transaction ? pendingData[id] ?? data[id] : data[id]),
      })),
      findAll: [
        {
          id: 'apple-05-sequelize',
          field1: 'set apple at block 5 with sequelize',
        },
      ],
      findOne: jest.fn(({transaction, where: {id}}) => ({
        toJSON: () => (transaction ? pendingData[id] ?? data[id] : data[id]),
      })),
      bulkCreate: jest.fn((records: {id: string}[]) => {
        records.map((r) => (pendingData[r.id] = r));
      }),
      destroy: jest.fn(),
    }),
    sync: jest.fn(),
    transaction: () => ({
      commit: jest.fn(async () => {
        await delay(1);
        data = {...data, ...pendingData};
        pendingData = {};
        afterCommitHooks.map((fn) => fn());
        afterCommitHooks = [];
      }), // Delay of 1s is used to test whether we wait for cache to flush
      rollback: jest.fn(),
      afterCommit: jest.fn((fn) => afterCommitHooks.push(fn)),
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

describe('mmr service test', () => {
  const nodeConfig = {
    proofOfIndex: true,
    mmrStoreType: MmrStoreType.Postgres,
  } as any;

  const scheduler = new SchedulerRegistry();
  const eventEmitter = new EventEmitter2();
  const sequilize = new Sequelize();
  const storeCacheService = new StoreCacheService(sequilize, nodeConfig, eventEmitter, scheduler);
  const pgMmrCacheService = new PgMmrCacheService(scheduler);

  let mmrService: MmrService;
  beforeEach(() => {
    mmrService = new MmrService(nodeConfig, storeCacheService, pgMmrCacheService, eventEmitter);
  });

  describe('getLatestPoiWithMmr', () => {
    it('should query from metadata first, then use id to find from poi table', async () => {
      const meta = {
        findByPk: (key: string) => {
          if (key === 'latestPoiWithMmr') {
            return {
              toJSON: () => {
                return {value: '{"id":"5760","mmrRoot":"0"}'};
              },
            };
          }
        },
      };
      storeCacheService.setRepos(meta as unknown as MetadataRepo);
      (mmrService as any)._poi = {
        model: {
          findOne: jest.fn(({transaction, where: {id}}) => ({
            mmrRoot: new Uint8Array(),
            toJSON: () => {
              return {
                value: {
                  id: '5760',
                  mmrRoot: {
                    type: 'Buffer',
                    data: [
                      11, 114, 22, 152, 237, 93, 112, 201, 56, 157, 22, 122, 92, 18, 94, 16, 198, 10, 3, 98, 39, 156,
                      19, 113, 180, 81, 235, 198, 135, 59, 251, 69,
                    ],
                  },
                },
              };
            },
          })),
        },
      };
      const spyFind = jest.spyOn(storeCacheService.metadata, 'find');
      const spySyncMetaPoi = jest.spyOn(mmrService, 'syncMetadataLatestPoiWithMmr');
      await mmrService.getLatestPoiWithMmr();
      expect(spyFind).toBeCalledTimes(1);
      expect(spySyncMetaPoi).toBeCalledTimes(0);
    }, 10000);

    it('should get from poi if latestPoiWithMmr not found in metadata', async () => {
      const meta = {
        findByPk: (key: string) => {
          if (key === 'latestPoiWithMmr') {
            return null;
          }
        },
      };
      storeCacheService.setRepos(meta as unknown as MetadataRepo);
      (mmrService as any)._poi = {
        model: {
          findOne: jest.fn(({transaction, where: {id}}) => ({
            mmrRoot: new Uint8Array(),
            toJSON: () => {
              return {
                value: {
                  id: '5760',
                  mmrRoot: {
                    type: 'Buffer',
                    data: [
                      11, 114, 22, 152, 237, 93, 112, 201, 56, 157, 22, 122, 92, 18, 94, 16, 198, 10, 3, 98, 39, 156,
                      19, 113, 180, 81, 235, 198, 135, 59, 251, 69,
                    ],
                  },
                },
              };
            },
          })),
        },
        getLatestPoiWithMmr: jest.fn(() => {
          return {
            id: 5760,
            chainBlockHash: new Uint8Array(),
            hash: new Uint8Array(),
            operationHashRoot: new Uint8Array(),
            mmrRoot: new Uint8Array(),
          } as ProofOfIndex;
        }),
      };
      const spyFind = jest.spyOn(storeCacheService.metadata, 'find');
      const spySet = jest.spyOn(storeCacheService.metadata, 'set');
      const spySyncMetaPoi = jest.spyOn(mmrService, 'syncMetadataLatestPoiWithMmr');
      await mmrService.getLatestPoiWithMmr();
      expect(spyFind).toBeCalledTimes(1);
      expect(spySyncMetaPoi).toBeCalledTimes(1);
      expect(spySet).toBeCalledTimes(1);
    }, 20000);
  });
});
