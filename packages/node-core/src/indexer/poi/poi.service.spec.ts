// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// import {EventEmitter2} from '@nestjs/event-emitter';
// import {delay} from '@subql/common';
// import {Sequelize} from '@subql/x-sequelize';
// import {NodeConfig} from '../../configure';
// import {StoreCacheService} from '../storeCache';
// import {ISubqueryProject} from '../types';
// import {PoiService} from './poi.service';
//
// jest.mock('@subql/x-sequelize', () => {
//   const mSequelize = {};
//   const actualSequelize = jest.requireActual('@subql/x-sequelize');
//   return {
//     ...actualSequelize,
//     Sequelize: jest.fn(() => mSequelize),
//   };
// });
//
// function createPoiService(): PoiService {
//   const nodeConfig = {
//     proofOfIndex: true,
//     debug: false,
//   } as NodeConfig;
//
//   const sequelize = new Sequelize();
//   const eventEmitter = new EventEmitter2();
//   const storeCache = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
//
//   storeCache.init(true, false, {} as any, undefined);
//   storeCache.flushCache = jest.fn();
//   return new PoiService(nodeConfig, storeCache, eventEmitter, {id: 'testId'} as ISubqueryProject);
// }
//
// async function createGenesisPoi(poiService: PoiService) {
//   // mock poi repo
//   (poiService as any)._poiRepo = {
//     getPoiById: (id: number) => {
//       if (id === 100) {
//         return {
//           id: 100,
//           chainBlockHash: new Uint8Array(),
//           parentHash: null,
//           operationHashRoot: new Uint8Array(),
//         };
//       }
//     },
//     bulkUpsert: jest.fn(),
//     getPoiBlocksByRange: jest.fn(),
//   };
//   (poiService as any)._projectId = 'test';
//   await poiService.ensureGenesisPoi(100);
// }
//
// describe('Poi Service init', () => {
//   let poiService: PoiService;
//
//   beforeEach(() => {
//     poiService = createPoiService();
//   });
//
//   it('init should able to set latest SyncedPoi', async () => {
//     (poiService as any).storeCache.metadata.getCache = {latestSyncedPoiHeight: 100};
//     (poiService as any).storeCache.cachedModels._poi = {
//       getPoiById: jest.fn((id) => {
//         if (id === 100) {
//           return {
//             id: 100,
//             chainBlockHash: new Uint8Array(),
//             parentHash: new Uint8Array(),
//             hash: new Uint8Array(),
//             operationHashRoot: new Uint8Array(),
//           };
//         }
//       }),
//       bulkUpsert: jest.fn(),
//       getPoiBlocksByRange: jest.fn(),
//     };
//     const spyOnSetLatestSyncedPoi = jest.spyOn(poiService as any, 'setLatestSyncedPoi');
//     const spyOnMigration = jest.spyOn(poiService as any, 'migratePoi');
//     const spyOnCreateGenesisPoi = jest.spyOn(poiService as any, 'createGenesisPoi');
//     await poiService.init('test');
//     expect(spyOnSetLatestSyncedPoi).toHaveBeenCalledTimes(1);
//     expect(poiService.projectId).toBe('testId');
//     expect(poiService.latestSyncedPoi.id).toBe(100);
//     // Still called migration method, but should not process anything, as latestSyncedPoi is set
//     expect(spyOnMigration).toHaveBeenCalledTimes(1);
//     expect(spyOnCreateGenesisPoi).toHaveBeenCalledTimes(0);
//   });
//
//   it('should throw if set latestSyncedPoi is not valid', async () => {
//     (poiService as any).storeCache.metadata.getCache = {latestSyncedPoiHeight: 100};
//     (poiService as any).storeCache.cachedModels._poi = {
//       getPoiById: jest.fn((id) => {
//         if (id === 100) {
//           return {
//             id: 100,
//             chainBlockHash: new Uint8Array(),
//             operationHashRoot: new Uint8Array(),
//           };
//         }
//       }),
//       bulkUpsert: jest.fn(),
//       getPoiBlocksByRange: jest.fn(),
//     };
//     await expect(poiService.init('test')).rejects.toThrow(
//       `Found synced poi at height 100 is not valid, please check D`
//     );
//   });
// });
//
// describe('Poi Service sync', () => {
//   let poiService: PoiService;
//
//   beforeEach(() => {
//     poiService = createPoiService();
//   });
//
//   afterAll(() => {
//     poiService.onApplicationShutdown();
//   });
//
//   it('sync hold until genesis poi been created', () => {
//     const spyOnSync = jest.spyOn(poiService as any, 'syncPoiJob');
//     void poiService.syncPoi(100);
//     expect(spyOnSync).not.toHaveBeenCalled();
//   });
//
//   it('create genesis poi if latestSyncedPoi not defined', async () => {
//     await createGenesisPoi(poiService);
//     expect(poiService.latestSyncedPoi.hash).toBeDefined();
//     expect(poiService.latestSyncedPoi.parentHash).toBeDefined();
//     expect(poiService.latestSyncedPoi.id).toBe(100);
//   });
//
//   it('should skip create genesis poi if latestSyncedPoi existed', async () => {
//     const spyOnCreateGenesisPoi = jest.spyOn(poiService as any, 'createGenesisPoi');
//     await createGenesisPoi(poiService);
//     await poiService.ensureGenesisPoi(105);
//     // should be only called once
//     expect(spyOnCreateGenesisPoi).toHaveBeenCalledTimes(1);
//     // And genesis poi should not be changed
//     expect(poiService.latestSyncedPoi.id).toBe(100);
//   });
//
//   it('sync poi block in continuous range', async () => {
//     await createGenesisPoi(poiService);
//     poiService.poiRepo.bulkUpsert = jest.fn();
//     const spyOnPoiCreation = jest.spyOn(poiService.poiRepo, 'bulkUpsert');
//     const spyOnCreateDefaultBlock = jest.spyOn(poiService as any, 'addDefaultPoiBlocks');
//     // mock existing poi blocks data
//     poiService.poiRepo.getPoiBlocksByRange = jest.fn().mockImplementation(() => [
//       {
//         id: 101,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//       {
//         id: 102,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//       {
//         id: 103,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//     ]);
//     await poiService.syncPoi(102);
//     expect(spyOnPoiCreation).toHaveBeenCalled();
//     expect(spyOnCreateDefaultBlock).not.toHaveBeenCalled();
//   }, 50000);
//
//   it('sync poi block in discontinuous range,should get default block created', async () => {
//     await createGenesisPoi(poiService);
//     poiService.poiRepo.bulkUpsert = jest.fn();
//     const spyOnPoiCreation = jest.spyOn(poiService.poiRepo, 'bulkUpsert');
//     const spyOnCreateDefaultBlock = jest.spyOn(poiService as any, 'addDefaultPoiBlocks');
//     const spyOnSetLatestSyncedPoi = jest.spyOn(poiService as any, 'setLatestSyncedPoi');
//
//     // mock existing poi blocks data
//     poiService.poiRepo.getPoiBlocksByRange = jest.fn().mockImplementation(() => [
//       {
//         id: 101,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//       {
//         id: 102,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//       {
//         id: 105,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//     ]);
//     await poiService.syncPoi(102);
//     expect(spyOnPoiCreation).toHaveBeenCalled();
//     expect(spyOnCreateDefaultBlock).toHaveBeenCalledTimes(1);
//     // Set block 101,102,103,104,105
//     expect(spyOnSetLatestSyncedPoi).toHaveBeenCalledTimes(5);
//   }, 50000);
//
//   it('if sync poi block out of order, it will throw', async () => {
//     await createGenesisPoi(poiService);
//     poiService.poiRepo.bulkUpsert = jest.fn();
//     await (poiService as any).syncPoiJob([
//       {
//         id: 101,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//       {
//         id: 105,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//     ]);
//     expect(() =>
//       (poiService as any).syncPoiJob([
//         {
//           id: 103,
//           chainBlockHash: new Uint8Array(),
//           parentHash: null,
//           operationHashRoot: new Uint8Array(),
//         },
//       ])
//     ).toThrow(/Sync poi block out of order, latest synced poi height/);
//   }, 50000);
//
//   it('could stop sync', async () => {
//     await createGenesisPoi(poiService);
//     poiService.poiRepo.bulkUpsert = jest.fn();
//
//     // mock existing poi blocks data
//     poiService.poiRepo.getPoiBlocksByRange = jest.fn().mockImplementation(() => [
//       {
//         id: 101,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//       {
//         id: 102,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//       {
//         id: 105,
//         chainBlockHash: new Uint8Array(),
//         parentHash: null,
//         operationHashRoot: new Uint8Array(),
//       },
//     ]);
//     void poiService.syncPoi();
//     await delay(2);
//     // Assumed reindex happened, and rollback to 101
//     await poiService.stopSync();
//
//     // Service still exist, and data should be last one synced
//     expect(poiService).toBeTruthy();
//     expect((poiService as any).latestSyncedPoi.id).toBe(105);
//
//     expect((poiService as any).isSyncing).toBeFalsy();
//     expect((poiService as any).isShutdown).toBeTruthy();
//   }, 500000);
// });
