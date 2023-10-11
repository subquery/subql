// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {delay} from '@subql/common';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {MetadataFactory, PlainPoiModel, PoiFactory} from '../../indexer';
import {Queue} from '../../utils';
import {ISubqueryProject} from '../types';
import {PoiSyncService} from './poiSync.service';

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
    // model: (entity: string) => ({
    //   getTableName: () => 'table1',
    //   sequelize: {
    //     escape: (key: any) => key,
    //     query: (sql: string, option?: any) => jest.fn(),
    //     fn: jest.fn().mockImplementation(() => {
    //       return {fn: 'int8range', args: [41204769, null]};
    //     }),
    //   },
    //   upsert: jest.fn(),
    //   findByPk: jest.fn((key:string) => ({
    //     toJSON: () => (key === 'latestSyncedPoiHeight'?{values:10}:undefined),
    //   })),
    //   findOne: jest.fn(({transaction, where: {id}}) => ({
    //     toJSON: () => (transaction ? pendingData[id] ?? data[id] : data[id]),
    //   })),
    //   bulkCreate: jest.fn((records: {id: string}[]) => {
    //     records.map((r) => (pendingData[r.id] = r));
    //   }),
    //   destroy: jest.fn(),
    // }),
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

async function createPoiSyncService(): Promise<PoiSyncService> {
  const nodeConfig = {
    proofOfIndex: true,
    debug: false,
  } as unknown as NodeConfig;

  const eventEmitter = new EventEmitter2();

  const sequelize = new Sequelize();
  const poiSyncService = new PoiSyncService(nodeConfig, eventEmitter, {id: 'testId'} as ISubqueryProject);
  (poiSyncService as any)._sequelize = sequelize;

  (poiSyncService as any)._poiRepo = new PlainPoiModel(PoiFactory(sequelize, 'testSchema'));
  (poiSyncService as any)._metadataRepo = await MetadataFactory(
    sequelize,
    'testSchema',
    false,
    '' //No multi chain involved
  );
  return poiSyncService;
}

async function createGenesisPoi(poiSyncService: PoiSyncService) {
  // mock poi repo
  const genesisPoi = {
    id: 100,
    chainBlockHash: new Uint8Array(),
    hash: new Uint8Array(),
    parentHash: new Uint8Array(),
    operationHashRoot: new Uint8Array(),
  };
  (poiSyncService as any)._poiRepo = {
    getPoiById: (id = 100) => {
      return genesisPoi;
    },
    getFirst: () => {
      return genesisPoi;
    },
    bulkUpsert: jest.fn(),
    getPoiBlocksByRange: jest.fn(),
  };
  (poiSyncService as any)._projectId = 'test';
  (poiSyncService as any).updateMetadataSyncedPoi = jest.fn(); // Mock upsert metadata
  (poiSyncService as any).getMetadataLatestSyncedPoi = jest.fn(() => 100);
  await (poiSyncService as any).ensureGenesisPoi();
  await (poiSyncService as any).syncLatestSyncedPoiFromDb();
}

describe('Poi Service sync', () => {
  let poiSyncService: PoiSyncService;

  beforeEach(async () => {
    poiSyncService = await createPoiSyncService();
  });

  afterAll(() => {
    poiSyncService.stopSync();
    poiSyncService.onApplicationShutdown();
  });

  it('sync hold until genesis poi been created', () => {
    const spyOnSync = jest.spyOn(poiSyncService as any, 'syncPoiJob');
    void poiSyncService.syncPoi(100);
    expect(spyOnSync).not.toHaveBeenCalled();
  });

  it('could set genesis Poi into metadata', async () => {
    await createGenesisPoi(poiSyncService);
    expect(poiSyncService.latestSyncedPoi.hash).toBeDefined();
    expect(poiSyncService.latestSyncedPoi.parentHash).toBeDefined();
    expect(poiSyncService.latestSyncedPoi.id).toBe(100);
  });

  it('should skip create genesis poi if latestSyncedPoi existed', async () => {
    const spyOnCreateGenesisPoi = jest.spyOn(poiSyncService as any, 'createGenesisPoi');
    await createGenesisPoi(poiSyncService);
    //mock fetch poi block from db
    poiSyncService.poiRepo.getPoiBlocksByRange = jest.fn().mockImplementation(() => [
      {
        id: 101,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
      {
        id: 102,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
      {
        id: 103,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
    ]);
    void poiSyncService.syncPoi(100);
    // should be only called once
    expect(spyOnCreateGenesisPoi).toHaveBeenCalledTimes(1);
    // And genesis poi should not be changed
    expect(poiSyncService.latestSyncedPoi.id).toBe(100);
  });

  it('sync poi block in continuous range', async () => {
    await createGenesisPoi(poiSyncService);
    poiSyncService.poiRepo.bulkUpsert = jest.fn();
    const spyOnPoiCreation = jest.spyOn(poiSyncService.poiRepo, 'bulkUpsert');
    const spyOnCreateDefaultBlock = jest.spyOn(poiSyncService as any, 'addDefaultPoiBlocks');

    // Reduce queue size, make sure flush triggered
    (poiSyncService as any).syncedPoiQueue = new Queue(2);
    // mock existing poi blocks data
    poiSyncService.poiRepo.getPoiBlocksByRange = jest.fn().mockImplementation(() => [
      {
        id: 101,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
      {
        id: 102,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
      {
        id: 103,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
    ]);
    await poiSyncService.syncPoi(102);
    expect(spyOnPoiCreation).toHaveBeenCalled();
    expect(spyOnCreateDefaultBlock).not.toHaveBeenCalled();
  }, 50000);

  it('sync poi block in discontinuous range,should get default block created', async () => {
    await createGenesisPoi(poiSyncService);
    poiSyncService.poiRepo.bulkUpsert = jest.fn();
    const spyOnPoiCreation = jest.spyOn(poiSyncService.poiRepo, 'bulkUpsert');
    const spyOnCreateDefaultBlock = jest.spyOn(poiSyncService as any, 'addDefaultPoiBlocks');
    const spyOnSetLatestSyncedPoi = jest.spyOn(poiSyncService as any, 'setLatestSyncedPoi');

    // Reduce queue size, make sure flush triggered
    (poiSyncService as any).syncedPoiQueue = new Queue(4);
    // mock existing poi blocks data
    poiSyncService.poiRepo.getPoiBlocksByRange = jest.fn().mockImplementation(() => [
      {
        id: 101,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
      {
        id: 102,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
      {
        id: 105,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
    ]);
    await poiSyncService.syncPoi(102);
    expect(spyOnPoiCreation).toHaveBeenCalled();
    expect(spyOnCreateDefaultBlock).toHaveBeenCalledTimes(1);
    // Set block 101,102,103,104,105
    expect(spyOnSetLatestSyncedPoi).toHaveBeenCalledTimes(5);
  }, 50000);

  it('if sync poi block out of order, it will throw', async () => {
    await createGenesisPoi(poiSyncService);
    poiSyncService.poiRepo.bulkUpsert = jest.fn();
    (poiSyncService as any).syncedPoiQueue = new Queue(2);

    await (poiSyncService as any).syncPoiJob([
      {
        id: 101,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
      {
        id: 105,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
    ]);
    await expect(() =>
      (poiSyncService as any).syncPoiJob([
        {
          id: 103,
          chainBlockHash: new Uint8Array(),
          parentHash: null,
          operationHashRoot: new Uint8Array(),
        },
      ])
    ).rejects.toThrow(/Sync poi block out of order, latest synced poi height/);
  }, 50000);

  it('could stop sync and clear', async () => {
    await createGenesisPoi(poiSyncService);
    poiSyncService.poiRepo.bulkUpsert = jest.fn();

    // mock existing poi blocks data
    poiSyncService.poiRepo.getPoiBlocksByRange = jest.fn().mockImplementation(() => [
      {
        id: 101,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
      {
        id: 102,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
      {
        id: 105,
        chainBlockHash: new Uint8Array(),
        parentHash: null,
        operationHashRoot: new Uint8Array(),
      },
    ]);
    void poiSyncService.syncPoi();
    await delay(2);
    // Assumed reindex happened, and rollback to 101
    await poiSyncService.stopSync();

    // Service still exist, and data should be last one synced
    expect(poiSyncService).toBeTruthy();
    expect((poiSyncService as any).latestSyncedPoi.id).toBe(105);

    expect((poiSyncService as any).isSyncing).toBeFalsy();
    expect((poiSyncService as any).isShutdown).toBeTruthy();

    // clear data for rewind
    poiSyncService.clear();
    expect((poiSyncService as any)._latestSyncedPoi).toBeUndefined();
    // Should be empty
    expect((poiSyncService as any).syncedPoiQueue.size).toBe(0);
  }, 500000);
});
