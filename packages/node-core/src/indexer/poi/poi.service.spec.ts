// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {Test, TestingModule} from '@nestjs/testing';
import {delay} from '@subql/common';
import {Sequelize, Transaction} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {ProofOfIndex} from '../entities/Poi.entity';
import {StoreCacheService} from '../storeCache';
import {PoiService} from './poi.service';

jest.mock('@subql/x-sequelize', () => {
  let data: Record<string, any> = {};

  let pendingData: typeof data = {};
  let afterCommitHooks: Array<() => void> = [];

  const mSequelize = {
    authenticate: jest.fn(),
    define: () => ({
      findOne: jest.fn(),
      create: (input: any) => input,
      findByPk: jest.fn((key: string) => ({
        toJSON: () => (key === 'latestSyncedPoiHeight' ? {values: 10} : undefined),
      })),
    }),
    query: () => [{nextval: 1}],
    showAllSchemas: () => ['subquery_1'],
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
    ...actualSequelize,
    Sequelize: jest.fn(() => mSequelize),
  };
});

describe('PoiService', () => {
  let service: PoiService;
  let nodeConfig: NodeConfig;
  let storeCache: StoreCacheService;

  beforeEach(async () => {
    nodeConfig = {
      proofOfIndex: true,
      debug: false,
    } as unknown as NodeConfig;

    const sequelize = new Sequelize();
    storeCache = new StoreCacheService(sequelize, nodeConfig, new EventEmitter2(), new SchedulerRegistry());

    storeCache.init(true, true, {} as any, {} as any);
    (storeCache as any).cachedModels._metadata = {
      find: jest.fn().mockResolvedValue(10),
      bulkRemove: jest.fn(),
      set: jest.fn(),
      findByPk: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoiService,
        {provide: NodeConfig, useValue: nodeConfig},
        {provide: StoreCacheService, useValue: storeCache},
      ],
    }).compile();

    service = module.get<PoiService>(PoiService);
  });

  afterEach(async () => {
    await storeCache?.beforeApplicationShutdown();
    service.onApplicationShutdown();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('PoiToHuman', () => {
    it('should convert ProofOfIndex to ProofOfIndexHuman', () => {
      const proofOfIndex: ProofOfIndex = {
        id: 1,
        parentHash: Buffer.from('parentHash'),
        hash: Buffer.from('hash'),
        chainBlockHash: Buffer.from('chainBlockHash'),
        operationHashRoot: Buffer.from('operationHashRoot'),
      };

      const result = PoiService.PoiToHuman(proofOfIndex);
      expect(result).toEqual({
        ...proofOfIndex,
        parentHash: '0x706172656e7448617368',
        hash: '0x68617368',
        chainBlockHash: '0x636861696e426c6f636b48617368',
        operationHashRoot: '0x6f7065726174696f6e48617368526f6f74',
      });
    });
  });

  describe('init', () => {
    it('should initialize the poiRepo and migratePoi if needed', async () => {
      (storeCache as any).cachedModels._metadata = {
        find: jest.fn().mockResolvedValue(undefined),
        bulkRemove: jest.fn(),
        set: jest.fn(),
        findByPk: jest.fn().mockResolvedValue(undefined),
      } as any;

      (service as any).migratePoi = jest.fn();

      const spyOnMigration = jest.spyOn(service as any, 'migratePoi');

      await service.init('testSchema');
      expect(storeCache.metadata.find).toHaveBeenCalledWith('latestSyncedPoiHeight');
      expect(spyOnMigration).toHaveBeenCalled();
    });

    it('should not migratePoi if latestSyncedPoiHeight is defined', async () => {
      await service.init('testSchema');
      expect(storeCache.metadata.find).toHaveBeenCalledWith('latestSyncedPoiHeight');
    });
  });

  describe('rewind', () => {
    it('should rewind the poi records and update metadata', async () => {
      const transaction = {} as Transaction;
      const targetBlockHeight = 5;
      (storeCache as any).cachedModels._metadata = {
        find: jest.fn().mockResolvedValue(10),
        bulkRemove: jest.fn(),
        set: jest.fn(),
      } as any;

      (service as any)._poiRepo = {
        model: {
          findOne: jest.fn().mockResolvedValueOnce({id: 1}),
          findAll: jest
            .fn()
            .mockResolvedValueOnce([{id: 1}])
            .mockResolvedValueOnce([]), // first time return to destroy, second time to stop
          destroy: jest.fn().mockResolvedValueOnce(1),
        },
      } as any;

      await service.rewind(targetBlockHeight, transaction);
      expect(storeCache.metadata.bulkRemove).toHaveBeenCalledWith(['lastCreatedPoiHeight']);
    });
  });

  describe('migratePoi', () => {
    it('should migrate the POI table', async () => {
      const schema = 'testSchema';
      const mockRepo = {
        model: {
          getTableName: jest.fn().mockReturnValue('poi'),
          sequelize: {
            query: jest.fn(),
            transaction: jest.fn().mockResolvedValue({
              commit: jest.fn(),
            }),
          },
        },
      };
      (service as any)._poiRepo = mockRepo as any;

      await (service as any).migratePoi(schema);
      expect(mockRepo.model.getTableName).toHaveBeenCalled();
    });

    it('should throw an error if migration fails', async () => {
      const schema = 'testSchema';
      const mockRepo = {
        model: {
          getTableName: jest.fn().mockReturnValue('testTable'),
          sequelize: {
            query: jest.fn().mockRejectedValue(new Error('Migration failed')),
            transaction: jest.fn().mockResolvedValue({
              commit: jest.fn(),
            }),
          },
        },
      };
      (service as any)._poiRepo = mockRepo as any;

      await expect((service as any).migratePoi(schema)).rejects.toThrow('Failed to migrate poi table. {e}');
    });
  });
});
