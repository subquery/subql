// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {buildSchemaFromString} from '@subql/utils';
import {IBlockchainService} from '../blockchain.service';
import {NodeConfig, ProjectUpgradeService} from '../configure';
import {DsProcessorService} from './ds-processor.service';
import {DatasourceParams, DynamicDsService} from './dynamic-ds.service';
import {ProjectService} from './project.service';
import {Header, IBlock, ISubqueryProject} from './types';
import {
  METADATA_LAST_FINALIZED_PROCESSED_KEY,
  METADATA_UNFINALIZED_BLOCKS_KEY,
  UnfinalizedBlocksService,
} from './unfinalizedBlocks.service';
import {IBaseIndexerWorker} from './worker';

class TestProjectService extends ProjectService<any, any> {
  packageVersion = '1.0.0';

  async getBlockTimestamp(height: number): Promise<Date> {
    return Promise.resolve(new Date());
  }

  onProjectChange(project: any): void {
    return;
  }

  protected async getExistingProjectSchema(): Promise<string | undefined> {
    return Promise.resolve('test');
  }
}

class TestBlockchainService implements IBlockchainService {
  packageVersion = '0.0.0';
  blockHandlerKind = '';

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  fetchBlocks(blockNums: number[]): Promise<IBlock<any>[]> {
    throw new Error('Method fetchBlocks not implemented.');
  }

  onProjectChange(project: ISubqueryProject): Promise<void> | void {
    // throw new Error('Method onProjectChange not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBlockTimestamp(height: number): Promise<Date | undefined> {
    throw new Error('Method getBlockTimestamp not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getBestHeight(): Promise<number> {
    throw new Error('Method getBestHeight not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getChainInterval(): Promise<number> {
    throw new Error('Method getChainInterval not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  updateDynamicDs(params: DatasourceParams, template: any): Promise<void> {
    throw new Error('Method updateDynamicDs not implemented.');
  }
  isCustomDs(x: any): x is any {
    return false;
  }
  isRuntimeDs(x: any): x is any {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getSafeApi(block: any): Promise<any> {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  fetchBlockWorker(
    worker: IBaseIndexerWorker,
    blockNum: number,
    context: {workers: IBaseIndexerWorker[]}
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async getFinalizedHeader(): Promise<Header> {
    return {
      blockHash: 'asdf',
      blockHeight: 1000,
      parentHash: 'efgh',
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getHeaderForHash(hash: string): Promise<Header> {
    const num = parseInt(hash.slice(1), 10);
    return {
      blockHeight: num,
      blockHash: hash,
      parentHash: `b${num - 1}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getHeaderForHeight(height: number): Promise<Header> {
    return {
      blockHeight: height,
      blockHash: `b${height}`,
      parentHash: `b${height - 1}`,
    };
  }
}

describe('BaseProjectService', () => {
  let service: TestProjectService;

  beforeEach(() => {
    service = new TestProjectService(
      null as unknown as DsProcessorService,
      null as unknown as any,
      null as unknown as any,
      null as unknown as any,
      null as unknown as any,
      {dataSources: []} as unknown as ISubqueryProject<any>,
      null as unknown as any,
      null as unknown as any,
      {unsafe: false} as unknown as NodeConfig,
      {getDynamicDatasources: jest.fn()} as unknown as DynamicDsService<any>,
      null as unknown as any,
      null as unknown as any,
      new TestBlockchainService()
    );
  });

  it('hasDataSourcesAfterHeight', () => {
    (service as any).dynamicDsService.dynamicDatasources = [];
    (service as any).projectUpgradeService = {
      projects: [
        [
          1,
          {
            dataSources: [
              {startBlock: 1, endBlock: 300},
              {startBlock: 10, endBlock: 20},
              {startBlock: 1, endBlock: 100},
              {startBlock: 50, endBlock: 200},
              {startBlock: 500},
            ],
          },
        ],
      ],
    } as any;

    const result1 = service.hasDataSourcesAfterHeight(301);
    expect(result1).toBe(true);
    const result2 = service.hasDataSourcesAfterHeight(502);
    expect(result2).toBe(true);
  });

  it('hasDataSourcesAfterHeight - no available datasource', () => {
    (service as any).dynamicDsService.dynamicDatasources = [];
    (service as any).projectUpgradeService = {
      projects: [
        [
          1,
          {
            dataSources: [
              {startBlock: 1, endBlock: 300},
              {startBlock: 10, endBlock: 20},
              {startBlock: 1, endBlock: 100},
              {startBlock: 50, endBlock: 200},
            ],
          },
        ],
      ],
    } as any;

    const result = service.hasDataSourcesAfterHeight(301);
    expect(result).toBe(false);
  });

  it('getDataSources', async () => {
    (service as any).project.dataSources = [
      {startBlock: 100, endBlock: 200},
      {startBlock: 1, endBlock: 100},
    ];
    (service as any).dynamicDsService.getDynamicDatasources = jest
      .fn()
      .mockResolvedValue([{startBlock: 150, endBlock: 250}]);

    const result = await service.getDataSources(175);
    expect(result).toEqual([
      {startBlock: 100, endBlock: 200},
      {startBlock: 150, endBlock: 250},
    ]);
  });

  describe('getDatasourceMap', () => {
    it('should add endBlock heights correctly', () => {
      (service as any).dynamicDsService.dynamicDatasources = [];
      (service as any).projectUpgradeService = {
        projects: [
          [
            1,
            {
              dataSources: [
                {startBlock: 1, endBlock: 300},
                {startBlock: 10, endBlock: 20},
                {startBlock: 1, endBlock: 100},
                {startBlock: 50, endBlock: 200},
                {startBlock: 500},
              ],
            },
          ],
        ],
      } as any;

      const result = service.getDataSourcesMap();
      expect(result.getAll()).toEqual(
        new Map([
          [
            1,
            [
              {startBlock: 1, endBlock: 300},
              {startBlock: 1, endBlock: 100},
            ],
          ],
          [
            10,
            [
              {startBlock: 1, endBlock: 300},
              {startBlock: 1, endBlock: 100},
              {startBlock: 10, endBlock: 20},
            ],
          ],
          [
            21,
            [
              {startBlock: 1, endBlock: 300},
              {startBlock: 1, endBlock: 100},
            ],
          ],
          [
            50,
            [
              {startBlock: 1, endBlock: 300},
              {startBlock: 1, endBlock: 100},
              {startBlock: 50, endBlock: 200},
            ],
          ],
          [
            101,
            [
              {startBlock: 1, endBlock: 300},
              {startBlock: 50, endBlock: 200},
            ],
          ],
          [201, [{startBlock: 1, endBlock: 300}]],
          [301, []],
          [500, [{startBlock: 500}]],
        ])
      );
    });

    it('should contain datasources from current project only', () => {
      (service as any).dynamicDsService.dynamicDatasources = [];
      (service as any).projectUpgradeService = {
        projects: [
          [
            1,
            {
              dataSources: [{startBlock: 1}, {startBlock: 200}],
            },
          ],
          [
            100,
            {
              dataSources: [{startBlock: 100}],
            },
          ],
        ],
      } as any;

      const result = service.getDataSourcesMap();
      expect(result.getAll()).toEqual(
        new Map([
          [1, [{startBlock: 1}]],
          [100, [{startBlock: 100}]],
        ])
      );
    });

    it('build correct map when upgrade has the same start height as first project', () => {
      (service as any).dynamicDsService.dynamicDatasources = [];
      (service as any).projectUpgradeService = {
        projects: [
          [
            7408909,
            {
              dataSources: [{startBlock: 7408909}],
            },
          ],
          [
            7880532,
            {
              dataSources: [{startBlock: 7408909}],
            },
          ],
        ],
      } as any;

      const result = service.getDataSourcesMap();
      expect(result.getAll()).toEqual(
        new Map([
          [7408909, [{startBlock: 7408909}]],
          [7880532, [{startBlock: 7408909}]],
        ])
      );
    });
  });

  // Tests initializing the project service to ensure that things are initialized in the correct order
  // NOTE: this is not currently covering all scenarios
  describe('initializing services', () => {
    beforeAll(() => {
      process.env.TZ = 'utc';
    });

    const defaultProjects = [
      {
        id: '1',
        network: {
          chainId: '1',
        },
        dataSources: [{startBlock: 1}],
        schema: buildSchemaFromString(`type TestEntity @entity {
  id: ID!
  fieldOne: String
  fieldTwo: Int
  #  fieldThree: BigInt!
}`),
        applyCronTimestamps: jest.fn(),
      } as unknown as ISubqueryProject<any>,
    ];

    const setupProject = async (
      startBlock = 1,
      unfinalizedBlocks: Header[] = [],
      lastFinalizedHeight?: number,
      projects: ISubqueryProject<any>[] = defaultProjects
    ) => {
      const project = projects[0];

      const projectUpgradeService = await ProjectUpgradeService.create(project, (id: string) =>
        Promise.resolve(projects[parseInt(id, 10)])
      );

      const nodeConfig = {unsafe: false} as unknown as NodeConfig;

      const storeService = {
        init: jest.fn(),
        initCoreTables: jest.fn(),
        historical: true,
        storeCache: {
          metadata: {
            findMany: jest.fn(() => ({})),
            find: jest.fn((key: string) => {
              switch (key) {
                case METADATA_LAST_FINALIZED_PROCESSED_KEY:
                  return lastFinalizedHeight;
                case METADATA_UNFINALIZED_BLOCKS_KEY:
                  return JSON.stringify(unfinalizedBlocks);
                case 'lastProcessedHeight':
                  return startBlock - 1;
                case 'deployments':
                  return JSON.stringify({1: '1'});
                default:
                  return undefined;
              }
            }),
            set: jest.fn(),
            flush: jest.fn(),
          },
          resetCache: jest.fn(),
          flushCache: jest.fn(),
          _flushCache: jest.fn(),
        },
        rewind: jest.fn(),
      } as unknown as any;

      const blockchainService = new TestBlockchainService();

      service = new TestProjectService(
        {
          validateProjectCustomDatasources: jest.fn(),
        } as unknown as DsProcessorService, // dsProcessorService
        {networkMeta: {}} as unknown as any, //apiService
        null as unknown as any, // poiService
        null as unknown as any, // poiSyncService
        {
          transaction: jest.fn(() => ({
            rollback: jest.fn(),
            commit: jest.fn(),
          })),
        } as unknown as any, // sequelize
        project, // project
        projectUpgradeService, // projectUpgradeService
        storeService, // storeService
        nodeConfig,
        {
          init: jest.fn(),
          getDynamicDatasources: jest.fn(() => []),
          resetDynamicDatasource: jest.fn(),
        } as unknown as DynamicDsService<any>, // dynamicDsService
        new EventEmitter2(), // eventEmitter
        new UnfinalizedBlocksService(nodeConfig, storeService.storeCache, blockchainService), // unfinalizedBlocksService
        blockchainService
      );
    };

    it('succeeds with no rewinds', async () => {
      await setupProject();

      await expect(service.init()).resolves.not.toThrow();
    });

    it('succeeds with a project upgrade rewind', async () => {
      const projects = [
        {
          ...defaultProjects[0],
          id: '0',
          parent: {block: 20, untilBlock: 20, reference: '1'},
          schema: buildSchemaFromString(`type TestEntity @entity {
  id: ID!
  fieldOne: String
  fieldTwo: Int
  fieldThree: BigInt!
}`),
        },
        ...defaultProjects,
      ];
      await setupProject(100, [], 100, projects);

      const reindexSpy = jest.spyOn(service, 'reindex');
      await service.init();
      // await expect(service.init()).resolves.not.toThrow();
      expect(reindexSpy).toHaveReturnedTimes(1);
    });

    it('succeeds with an unfinalized blocks rewind', async () => {
      await setupProject(
        95,
        [
          {blockHeight: 100, blockHash: 'a100', parentHash: 'a99'},
          {blockHeight: 99, blockHash: 'a99', parentHash: 'a98'},
        ],
        90
      );

      const reindexSpy = jest.spyOn(service, 'reindex');

      await expect(service.init()).resolves.not.toThrow();

      expect(reindexSpy).toHaveReturnedTimes(1);
    });
  });
});
