// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {HttpException, HttpStatus} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Test, TestingModule} from '@nestjs/testing';
import {TargetBlockPayload, RewindPayload, AdminEvent} from '../events';
import {MonitorService, PoiService, ProofOfIndex, StoreService} from '../indexer';
import {AdminController, AdminListener} from './admin.controller';
import {BlockRangeDto} from './blockRange';

describe('AdminController', () => {
  let adminController: AdminController;
  let monitorService: MonitorService;
  let poiService: PoiService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: MonitorService,
          useValue: {
            getBlockIndexHistory: jest.fn(),
            getForkedRecords: jest.fn(),
            getBlockIndexRecords: jest.fn(),
          },
        },
        {
          provide: PoiService,
          useValue: {
            plainPoiRepo: {
              getStartAndEndBlock: jest.fn(),
              getPoiBlocksByRange: jest.fn(),
            },
            PoiToHuman: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emitAsync: jest.fn(),
            once: jest.fn(),
            emit: jest.fn(),
          },
        },
        {
          provide: StoreService,
          useValue: {
            syncDbSize: jest.fn(),
          },
        },
      ],
    }).compile();

    adminController = module.get<AdminController>(AdminController);
    monitorService = module.get<MonitorService>(MonitorService);
    poiService = module.get<PoiService>(PoiService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(adminController).toBeDefined();
  });

  describe('getIndexBlocks', () => {
    it('should return block index history', async () => {
      const result = ['block1', 'block2'];
      jest.spyOn(monitorService, 'getBlockIndexHistory').mockImplementation(() => result);

      await expect(adminController.getIndexBlocks()).resolves.toEqual(result);
    });

    it('should handle errors', async () => {
      jest.spyOn(monitorService, 'getBlockIndexHistory').mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(adminController.getIndexBlocks()).rejects.toThrow(HttpException);
    });
  });

  describe('getIndexForks', () => {
    it('should return forked records', async () => {
      const result = ['fork1', 'fork2'];
      jest.spyOn(monitorService, 'getForkedRecords').mockImplementation(() => Promise.resolve(result));

      await expect(adminController.getIndexForks()).resolves.toEqual(result);
    });

    it('should handle errors', async () => {
      jest.spyOn(monitorService, 'getForkedRecords').mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(adminController.getIndexForks()).rejects.toThrow(HttpException);
    });
  });

  describe('getIndexBlockRecord', () => {
    it('should return block index records', async () => {
      const result = ['record1', 'record2'];
      jest.spyOn(monitorService, 'getBlockIndexRecords').mockImplementation(() => Promise.resolve(result));

      await expect(adminController.getIndexBlockRecord('1')).resolves.toEqual(result);
    });

    it('should handle errors', async () => {
      jest.spyOn(monitorService, 'getBlockIndexRecords').mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(adminController.getIndexBlockRecord('1')).rejects.toThrow(HttpException);
    });
  });

  describe('getPoiRange', () => {
    it('should return POI range', async () => {
      const result = {startBlock: 1, endBlock: 10};
      jest.spyOn(poiService.plainPoiRepo, 'getStartAndEndBlock').mockImplementation(() => Promise.resolve(result));

      await expect(adminController.getPoiRange()).resolves.toEqual(result);
    });

    it('should handle errors', async () => {
      jest.spyOn(poiService.plainPoiRepo, 'getStartAndEndBlock').mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(adminController.getPoiRange()).rejects.toThrow(HttpException);
    });
  });

  describe('getPoisByRange', () => {
    it('should return POIs by range', async () => {
      const pois: ProofOfIndex[] = [
        {
          id: 1,
          chainBlockHash: new Uint8Array(),
          hash: new Uint8Array(),
          parentHash: new Uint8Array(),
          operationHashRoot: new Uint8Array(),
        },
      ];
      const blockRange = new BlockRangeDto(1, 10);
      jest.spyOn(poiService.plainPoiRepo, 'getPoiBlocksByRange').mockImplementation(() => Promise.resolve(pois));
      await expect(adminController.getPoisByRange(blockRange)).resolves.toEqual([
        {
          chainBlockHash: '0x',
          hash: '0x',
          id: 1,
          operationHashRoot: '0x',
          parentHash: '0x',
        },
      ]);
    });

    it('should handle errors', async () => {
      const blockRange = new BlockRangeDto(1, 10);
      jest.spyOn(poiService.plainPoiRepo, 'getPoiBlocksByRange').mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(() => adminController.getPoisByRange(blockRange)).rejects.toThrow(HttpException);
    });

    it('should throw an error if startBlock is greater than endBlock', async () => {
      const blockRange = new BlockRangeDto(10, 1);

      await expect(adminController.getPoisByRange(blockRange)).rejects.toThrow(HttpException);
    });
  });

  describe('rewindTarget', () => {
    it('should return successful rewind payload', async () => {
      const rewindData = {height: 1} as TargetBlockPayload;
      const result = {success: true, height: 1} as RewindPayload;
      jest.spyOn(eventEmitter, 'emitAsync').mockImplementation(() => Promise.resolve([]));
      jest.spyOn(eventEmitter, 'once').mockImplementation((event, callback) => {
        callback(result);
        return eventEmitter; // Ensure that it returns the eventEmitter instance
      });
      await expect(adminController.rewindTarget(rewindData)).resolves.toEqual(result);
    });

    it('should return failure if rewind times out', async () => {
      const rewindData = {height: 1} as TargetBlockPayload;

      jest.spyOn(eventEmitter, 'emitAsync').mockImplementation(() => Promise.resolve([]));
      jest.spyOn(eventEmitter, 'once').mockImplementation(() => {
        throw new Error('timeout');
      });

      const expectError = new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Rewind failed:',
          height: rewindData.height,
          success: false,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      await expect(adminController.rewindTarget(rewindData)).rejects.toThrow(expectError);
    });

    it('should handle errors', async () => {
      const rewindData = {height: 1} as TargetBlockPayload;

      jest.spyOn(eventEmitter, 'emitAsync').mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(adminController.rewindTarget(rewindData)).rejects.toThrow(
        new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Rewind failed:',
            height: rewindData.height,
            success: false,
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      );
    });
  });
});

describe('AdminListener', () => {
  let adminListener: AdminListener;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminListener,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    adminListener = module.get<AdminListener>(AdminListener);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(adminListener).toBeDefined();
  });

  describe('handleRewindSuccess', () => {
    it('should emit RewindTargetResponse event on rewind success', () => {
      const payload = {height: 1, success: true} as RewindPayload;

      adminListener.handleRewindSuccess(payload);

      expect(eventEmitter.emit).toHaveBeenCalledWith(AdminEvent.RewindTargetResponse, {
        ...payload,
        message: `Rewind to block ${payload.height} successful`,
      });
    });
  });

  describe('handleRewindFailure', () => {
    it('should emit RewindTargetResponse event on rewind failure', () => {
      const payload = {height: 1, success: false} as RewindPayload;

      adminListener.handleRewindFailure(payload);

      expect(eventEmitter.emit).toHaveBeenCalledWith(AdminEvent.RewindTargetResponse, payload);
    });
  });
});
