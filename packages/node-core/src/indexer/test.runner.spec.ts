// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Sequelize} from '@subql/x-sequelize';
import {TestRunner} from './test.runner';

jest.mock('@subql/x-sequelize');

describe('TestRunner', () => {
  let testRunner: TestRunner<any, any, any, any>;
  let sequelizeMock: jest.Mocked<Sequelize>;
  let apiServiceMock: any;
  let storeServiceMock: any;
  let sandboxMock: any;

  beforeEach(() => {
    sequelizeMock = new Sequelize() as any;
    apiServiceMock = {
      fetchBlocks: jest.fn().mockResolvedValue([{}]),
    };

    storeServiceMock = {
      setBlockHeight: jest.fn(),
      getStore: jest.fn().mockReturnValue({}),
      storeCache: {flushCache: jest.fn().mockResolvedValue(undefined)},
    };

    sandboxMock = {
      freeze: jest.fn(),
    };

    testRunner = new TestRunner<any, any, any, any>(
      apiServiceMock, // apiService
      storeServiceMock, // storeService
      sequelizeMock,
      {} as any, // nodeConfig
      {} as any // indexerManager
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cleans the database after each test run', async () => {
    const testMock = {
      name: 'test1',
      blockHeight: 1,
      handler: 'handler1',
      expectedEntities: [],
      dependentEntities: [],
    };

    const indexBlock = jest.fn().mockResolvedValue(undefined);

    await testRunner.runTest(testMock, sandboxMock, indexBlock);

    expect(sequelizeMock.dropSchema).toHaveBeenCalledTimes(1);
    expect(sequelizeMock.dropSchema).toHaveBeenCalledWith(expect.any(String), {
      logging: false,
      benchmark: false,
    });
  });

  it('increments passedTests when expected and actual entity attributes match', async () => {
    const expectedEntity = {
      _name: 'Entity1',
      id: '1',
      attr: 'value',
    };
    const testMock = {
      name: 'test1',
      blockHeight: 1,
      handler: 'handler1',
      expectedEntities: [expectedEntity],
      dependentEntities: [],
    };

    const indexBlock = jest.fn().mockResolvedValue(undefined);
    const storeMock = {
      get: jest.fn().mockResolvedValue(expectedEntity),
    };
    (testRunner as any).storeService = {
      getStore: () => storeMock,
      setBlockHeight: jest.fn(),
      storeCache: {flushCache: jest.fn().mockResolvedValue(undefined)},
    } as any;

    await testRunner.runTest(testMock, sandboxMock, indexBlock);

    expect((testRunner as any).passedTests).toBe(1);
  });

  it('increments failedTests when expected and actual entity attributes do not match', async () => {
    const expectedEntity = {
      _name: 'Entity1',
      id: '1',
      attr: 'expectedValue',
    };
    const actualEntity = {
      _name: 'Entity1',
      id: '1',
      attr: 'actualValue',
    };

    const testMock = {
      name: 'test1',
      blockHeight: 1,
      handler: 'handler1',
      expectedEntities: [expectedEntity],
      dependentEntities: [],
    };

    const indexBlock = jest.fn().mockResolvedValue(undefined);
    const storeMock = {
      get: jest.fn().mockResolvedValue(actualEntity),
    };
    (testRunner as any).storeService = {
      getStore: () => storeMock,
      setBlockHeight: jest.fn(),
      storeCache: {flushCache: jest.fn().mockResolvedValue(undefined)},
    } as any;

    await testRunner.runTest(testMock, sandboxMock, indexBlock);

    expect((testRunner as any).failedTests).toBe(1);
  });

  it('increments failedTests when indexBlock throws an error', async () => {
    const testMock = {
      name: 'test1',
      blockHeight: 1,
      handler: 'handler1',
      expectedEntities: [],
      dependentEntities: [],
    };

    const indexBlock = jest.fn().mockRejectedValue(new Error('Test error'));

    await testRunner.runTest(testMock, sandboxMock, indexBlock);

    expect((testRunner as any).failedTests).toBe(1);

    const summary = (testRunner as any).failedTestSummary;
    expect(summary?.testName).toEqual(testMock.name);
    expect(summary?.entityId).toBeUndefined();
    expect(summary?.entityName).toBeUndefined();
    expect(summary?.failedAttributes[0]).toEqual(expect.stringMatching(/^Runtime Error:\nError: Test error/));
  });

  it('gives a sufficient error for timestamps within MS of each other', async () => {
    const expectedEntity = {
      _name: 'Entity1',
      id: '1',
      timestamp: new Date(1000),
    };
    const actualEntity = {
      _name: 'Entity1',
      id: '1',
      timestamp: new Date(1001),
    };

    const testMock = {
      name: 'test1',
      blockHeight: 1,
      handler: 'handler1',
      expectedEntities: [expectedEntity],
      dependentEntities: [],
    };

    const indexBlock = jest.fn().mockResolvedValue(undefined);
    const storeMock = {
      get: jest.fn().mockResolvedValue(actualEntity),
    };
    (testRunner as any).storeService = {
      getStore: () => storeMock,
      setBlockHeight: jest.fn(),
      storeCache: {flushCache: jest.fn().mockResolvedValue(undefined)},
    } as any;

    await testRunner.runTest(testMock, sandboxMock, indexBlock);

    expect((testRunner as any).failedTests).toBe(1);

    const summary = (testRunner as any).failedTestSummary;
    expect(summary?.testName).toEqual(testMock.name);
    expect(summary?.entityId).toEqual(expectedEntity.id);
    expect(summary?.entityName).toEqual(expectedEntity._name);
    expect(summary?.failedAttributes[0]).toEqual(
      `\t\tattribute: "timestamp":\n\t\t\texpected: "1970-01-01T00:00:01.000Z"\n\t\t\tactual:   "1970-01-01T00:00:01.001Z"\n`
    );
  });
});
