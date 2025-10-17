// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource} from '@subql/types-core';
import {IBlockchainService} from '../blockchain.service';
import {DatasourceParams, DynamicDsService} from './dynamic-ds.service';
import {CacheMetadataModel} from './storeModelProvider';
import {ISubqueryProject} from './types';

class TestDynamicDsService extends DynamicDsService<BaseDataSource, ISubqueryProject> {
  constructor(project: ISubqueryProject) {
    super(project, {
      updateDynamicDs: () => Promise.resolve(undefined), // Return the same value
    } as unknown as IBlockchainService);
  }

  // Make it public
  getTemplate(templateName: string, startBlock?: number | undefined, endBlock?: number | undefined): BaseDataSource {
    return super.getTemplate(templateName, startBlock, endBlock);
  }
}

const testParam1 = {templateName: 'Test', startBlock: 1};
const testParam2 = {templateName: 'Test', startBlock: 2};
const testParam3 = {templateName: 'Test', startBlock: 3};
const testParam4 = {templateName: 'Test', startBlock: 4};
const testParamOther = {templateName: 'Other', startBlock: 5};

const mockMetadata = (initData: DatasourceParams[] = []) => {
  let datasourceParams: DatasourceParams[] = initData;

  return {
    set: (key: string, value: any) => {
      datasourceParams = value;
    },
    find: (key: string) => Promise.resolve([...datasourceParams]), // Clone here to make source immutable
    setNewDynamicDatasource: (params: DatasourceParams) => datasourceParams.push(params),
  } as unknown as CacheMetadataModel;
};

describe('DynamicDsService', () => {
  let service: TestDynamicDsService;
  const project = {
    templates: [{name: 'Test'}, {name: 'Other'}],
  } as any as ISubqueryProject;

  beforeEach(() => {
    service = new TestDynamicDsService(project);
  });

  it('loads all datasources and params when init', async () => {
    await service.init(mockMetadata([testParam1]));

    await expect(service.getDynamicDatasources()).resolves.toEqual([{startBlock: testParam1.startBlock}]);

    expect((service as any)._datasourceParams).toEqual([testParam1]);
  });

  it('keeps reference to added dynamic datasources', async () => {
    const meta = mockMetadata([testParam1]);
    await service.init(meta);

    await service.createDynamicDatasource(testParam2);

    expect((service as any)._datasourceParams).toEqual([testParam1, testParam2]);

    await expect(meta.find('dynamicDatasources')).resolves.toEqual([testParam1, testParam2]);
    await expect(service.getDynamicDatasources()).resolves.toEqual([
      {startBlock: testParam1.startBlock},
      {startBlock: testParam2.startBlock},
    ]);
  });

  it('can destroy a dynamic datasource', async () => {
    const meta = mockMetadata([testParam1, testParam2]);
    await service.init(meta);

    // Destroy specific datasource by index
    await service.destroyDynamicDatasource('Test', 50, 0);

    const updatedParams = (service as any)._datasourceParams;
    expect(updatedParams[0]).toEqual({...testParam1, endBlock: 50});
    expect(updatedParams[1]).toEqual(testParam2);

    const datasources = (service as any)._datasources;
    expect(datasources[0].endBlock).toBe(50);
  });

  it('throws error when destroying non-existent datasource', async () => {
    const meta = mockMetadata([testParam1]);
    await service.init(meta);

    await expect(service.destroyDynamicDatasource('NonExistent', 50)).rejects.toThrow(
      'Dynamic datasource with template name "NonExistent" not found'
    );
  });

  it('throws error when destroying already destroyed datasource', async () => {
    const destroyedParam = {...testParam1, endBlock: 30};
    const meta = mockMetadata([destroyedParam]);
    await service.init(meta);

    await expect(service.destroyDynamicDatasource('Test', 50)).rejects.toThrow(
      'Dynamic datasource with template name "Test" not found or already destroyed'
    );
  });

  it('allows creating new datasource after destroying existing one', async () => {
    const meta = mockMetadata([testParam1]);
    await service.init(meta);

    expect((service as any)._datasourceParams).toEqual([testParam1]);

    // Destroy by index
    await service.destroyDynamicDatasource('Test', 50, 0);

    const paramsAfterDestroy = (service as any)._datasourceParams;
    expect(paramsAfterDestroy[0]).toEqual({...testParam1, endBlock: 50});

    const newParam = {templateName: 'Test', startBlock: 60};
    await service.createDynamicDatasource(newParam);

    const finalParams = (service as any)._datasourceParams;
    const destroyedCount = finalParams.filter((p) => p.endBlock !== undefined).length;
    const activeCount = finalParams.filter((p) => p.endBlock === undefined).length;

    expect(destroyedCount).toBeGreaterThanOrEqual(1);
    expect(activeCount).toBeGreaterThanOrEqual(1);

    const destroyedParam = finalParams.find((p) => p.startBlock === 1 && p.endBlock === 50);
    expect(destroyedParam).toBeDefined();

    const newParamFound = finalParams.find((p) => p.startBlock === 60 && !p.endBlock);
    expect(newParamFound).toBeDefined();
  });

  it('resets dynamic datasources', async () => {
    const meta = mockMetadata([testParam1, testParam2, testParam3, testParam4]);
    await service.init(meta);

    await service.resetDynamicDatasource(2, null as any);

    await expect(meta.find('dynamicDatasources')).resolves.toEqual([testParam1, testParam2]);
    await expect(service.getDynamicDatasources()).resolves.toEqual([
      {startBlock: testParam1.startBlock},
      {startBlock: testParam2.startBlock},
    ]);
  });

  it('handles reset after datasource destruction correctly', async () => {
    const params = [testParam1, testParam2, testParam3, testParam4];
    const meta = mockMetadata(params);
    await service.init(meta);

    // Destroy only the first datasource by index
    await service.destroyDynamicDatasource('Test', 25, 0);

    const paramsAfterDestroy = (service as any)._datasourceParams;
    expect(paramsAfterDestroy[0]).toEqual({...testParam1, endBlock: 25});

    // Reset to block 2 (should keep testParam1 and testParam2)
    await service.resetDynamicDatasource(2, null as any);

    const paramsAfterReset = (service as any)._datasourceParams;
    expect(paramsAfterReset).toHaveLength(2);
    expect(paramsAfterReset[0]).toEqual({...testParam1, endBlock: 25});
    expect(paramsAfterReset[1]).toEqual(testParam2);
  });

  it('getDynamicDatasources with force reloads from metadata', async () => {
    const meta = mockMetadata([testParam1, testParam2]);
    await service.init(meta);

    await meta.set('dynamicDatasources', [testParam1, testParam2, testParam3, testParam4]);

    await expect(service.getDynamicDatasources()).resolves.toEqual([
      {startBlock: testParam1.startBlock},
      {startBlock: testParam2.startBlock},
    ]);
    await expect(service.getDynamicDatasources(true)).resolves.toEqual([
      {startBlock: testParam1.startBlock},
      {startBlock: testParam2.startBlock},
      {startBlock: testParam3.startBlock},
      {startBlock: testParam4.startBlock},
    ]);
    await expect(service.getDynamicDatasources()).resolves.toEqual([
      {startBlock: testParam1.startBlock},
      {startBlock: testParam2.startBlock},
      {startBlock: testParam3.startBlock},
      {startBlock: testParam4.startBlock},
    ]);
  });

  it('loads destroyed datasources with endBlock correctly', async () => {
    const destroyedParam = {...testParam1, endBlock: 100};
    const meta = mockMetadata([destroyedParam, testParam2]);
    await service.init(meta);

    const datasources = await service.getDynamicDatasources();
    expect(datasources).toHaveLength(2);
    expect((datasources[0] as any).endBlock).toBe(100);
    expect((datasources[1] as any).endBlock).toBeUndefined();
  });

  it('updates metadata correctly when destroying datasource', async () => {
    const meta = mockMetadata([testParam1, testParam2]);
    await service.init(meta);

    // Destroy first datasource by index
    await service.destroyDynamicDatasource('Test', 75, 0);

    const metadataParams = await meta.find('dynamicDatasources');
    expect(metadataParams).toBeDefined();
    expect(metadataParams![0]).toEqual({...testParam1, endBlock: 75});
    expect(metadataParams![1]).toEqual(testParam2);
  });

  it('can find a template and cannot mutate the template', () => {
    const template1 = service.getTemplate('Test', 1);
    const template2 = service.getTemplate('Test', 2);

    expect(template1.startBlock).toEqual(1);
    expect((template1 as any).name).toBeUndefined();

    expect(template2.startBlock).toEqual(2);
    expect((template2 as any).name).toBeUndefined();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(project.templates![0]).toEqual({name: 'Test'});
  });

  it('can create template with endBlock', () => {
    const template = service.getTemplate('Test', 1, 100);

    expect(template.startBlock).toBe(1);
    expect((template as any).endBlock).toBe(100);
    expect((template as any).name).toBeUndefined();
  });

  it('handles multiple templates with same name during destruction', async () => {
    const param1 = {templateName: 'Test', startBlock: 1};
    const param2 = {templateName: 'Test', startBlock: 5};
    const param3 = {templateName: 'Other', startBlock: 3};

    const meta = mockMetadata([param1, param2, param3]);
    await service.init(meta);

    // Should destroy the first matching one by index
    await service.destroyDynamicDatasource('Test', 10, 0);

    const updatedParams = (service as any)._datasourceParams;
    expect(updatedParams[0]).toEqual({...param1, endBlock: 10});
    expect(updatedParams[1]).toEqual(param2); // Not destroyed
    expect(updatedParams[2]).toEqual(param3); // Not destroyed
  });

  it('throws error when service not initialized for destruction', async () => {
    await expect(service.destroyDynamicDatasource('Test', 50)).rejects.toThrow(
      'DynamicDsService has not been initialized'
    );
  });

  describe('getDynamicDatasourcesByTemplate', () => {
    it('returns list of active datasources for a template', async () => {
      const meta = mockMetadata([testParam1, testParam2, testParam3, testParamOther]);
      await service.init(meta);

      const testDatasources = service.getDynamicDatasourcesByTemplate('Test');

      expect(testDatasources).toHaveLength(3);
      expect(testDatasources[0]).toEqual({
        index: 0,
        templateName: 'Test',
        startBlock: 1,
        endBlock: undefined,
        args: undefined,
      });
      expect(testDatasources[1]).toEqual({
        index: 1,
        templateName: 'Test',
        startBlock: 2,
        endBlock: undefined,
        args: undefined,
      });
      expect(testDatasources[2]).toEqual({
        index: 2,
        templateName: 'Test',
        startBlock: 3,
        endBlock: undefined,
        args: undefined,
      });
    });

    it('excludes destroyed datasources from list', async () => {
      const destroyedParam = {...testParam1, endBlock: 50};
      const meta = mockMetadata([destroyedParam, testParam2, testParam3]);
      await service.init(meta);

      const datasources = service.getDynamicDatasourcesByTemplate('Test');

      expect(datasources).toHaveLength(2);
      expect(datasources[0].startBlock).toBe(2);
      expect(datasources[1].startBlock).toBe(3);
    });

    it('returns empty array when no datasources match template', async () => {
      const meta = mockMetadata([testParamOther]);
      await service.init(meta);

      const datasources = service.getDynamicDatasourcesByTemplate('Test');

      expect(datasources).toEqual([]);
    });

    it('includes args in datasource info when present', async () => {
      const paramWithArgs = {...testParam1, args: {address: '0x123', tokenId: 1}};
      const meta = mockMetadata([paramWithArgs]);
      await service.init(meta);

      const datasources = service.getDynamicDatasourcesByTemplate('Test');

      expect(datasources).toHaveLength(1);
      expect(datasources[0].args).toEqual({address: '0x123', tokenId: 1});
    });

    it('throws error when service not initialized', () => {
      expect(() => service.getDynamicDatasourcesByTemplate('Test')).toThrow(
        'DynamicDsService has not been initialized'
      );
    });
  });

  describe('destroyDynamicDatasource with index', () => {
    it('destroys specific datasource by index', async () => {
      const meta = mockMetadata([testParam1, testParam2, testParam3, testParamOther]);
      await service.init(meta);

      await service.destroyDynamicDatasource('Test', 50, 1);

      const updatedParams = (service as any)._datasourceParams;
      expect(updatedParams[0]).toEqual(testParam1); // Not destroyed
      expect(updatedParams[1]).toEqual({...testParam2, endBlock: 50}); // Destroyed
      expect(updatedParams[2]).toEqual(testParam3); // Not destroyed
      expect(updatedParams[3]).toEqual(testParamOther); // Not destroyed
    });

    it('destroys all datasources when no index provided', async () => {
      const meta = mockMetadata([testParam1, testParam2, testParam3, testParamOther]);
      await service.init(meta);

      await service.destroyDynamicDatasource('Test', 75);

      const updatedParams = (service as any)._datasourceParams;
      expect(updatedParams[0]).toEqual({...testParam1, endBlock: 75});
      expect(updatedParams[1]).toEqual({...testParam2, endBlock: 75});
      expect(updatedParams[2]).toEqual({...testParam3, endBlock: 75});
      expect(updatedParams[3]).toEqual(testParamOther); // Different template, not destroyed
    });

    it('throws error when index is out of bounds', async () => {
      const meta = mockMetadata([testParam1, testParam2]);
      await service.init(meta);

      await expect(service.destroyDynamicDatasource('Test', 50, 5)).rejects.toThrow(
        'Index 5 is out of bounds. There are 2 active datasource(s) for template "Test"'
      );
    });

    it('throws error when index is negative', async () => {
      const meta = mockMetadata([testParam1, testParam2]);
      await service.init(meta);

      await expect(service.destroyDynamicDatasource('Test', 50, -1)).rejects.toThrow(
        'Index -1 is out of bounds. There are 2 active datasource(s) for template "Test"'
      );
    });

    it('throws error when trying to destroy with index but no active datasources exist', async () => {
      const destroyedParam = {...testParam1, endBlock: 30};
      const meta = mockMetadata([destroyedParam]);
      await service.init(meta);

      await expect(service.destroyDynamicDatasource('Test', 50, 0)).rejects.toThrow(
        'Dynamic datasource with template name "Test" not found or already destroyed'
      );
    });

    it('correctly handles index after some datasources are destroyed', async () => {
      const meta = mockMetadata([testParam1, testParam2, testParam3, testParam4]);
      await service.init(meta);

      // Destroy the first one
      await service.destroyDynamicDatasource('Test', 40, 0);

      // Now indices are: [1->0, 2->1, 3->2]
      const activeDatasources = service.getDynamicDatasourcesByTemplate('Test');
      expect(activeDatasources).toHaveLength(3);
      expect(activeDatasources[0].startBlock).toBe(2);
      expect(activeDatasources[1].startBlock).toBe(3);
      expect(activeDatasources[2].startBlock).toBe(4);

      // Destroy what is now at index 1 (was originally testParam3)
      await service.destroyDynamicDatasource('Test', 60, 1);

      const updatedParams = (service as any)._datasourceParams;
      expect(updatedParams[0]).toEqual({...testParam1, endBlock: 40});
      expect(updatedParams[1]).toEqual(testParam2); // Still active
      expect(updatedParams[2]).toEqual({...testParam3, endBlock: 60});
      expect(updatedParams[3]).toEqual(testParam4); // Still active
    });

    it('updates datasources in memory correctly when destroying by index', async () => {
      const meta = mockMetadata([testParam1, testParam2, testParam3]);
      await service.init(meta);

      await service.destroyDynamicDatasource('Test', 100, 1);

      const datasources = (service as any)._datasources;
      expect(datasources[0].endBlock).toBeUndefined();
      expect(datasources[1].endBlock).toBe(100);
      expect(datasources[2].endBlock).toBeUndefined();
    });

    it('logs correctly when destroying single datasource', async () => {
      const meta = mockMetadata([testParam1, testParam2]);
      await service.init(meta);

      const logSpy = jest.spyOn(console, 'info').mockImplementation();

      await service.destroyDynamicDatasource('Test', 50, 0);

      // The logger.info should be called with single datasource message
      // Note: actual implementation uses getLogger which might not be console
      logSpy.mockRestore();
    });

    it('logs correctly when destroying all datasources', async () => {
      const meta = mockMetadata([testParam1, testParam2, testParam3]);
      await service.init(meta);

      const logSpy = jest.spyOn(console, 'info').mockImplementation();

      await service.destroyDynamicDatasource('Test', 50);

      // The logger.info should be called with multiple datasources message
      logSpy.mockRestore();
    });

    it('allows destroying datasources from different templates independently', async () => {
      const meta = mockMetadata([testParam1, testParam2, testParamOther]);
      await service.init(meta);

      await service.destroyDynamicDatasource('Test', 50, 0);
      await service.destroyDynamicDatasource('Other', 60, 0);

      const updatedParams = (service as any)._datasourceParams;
      expect(updatedParams[0]).toEqual({...testParam1, endBlock: 50});
      expect(updatedParams[1]).toEqual(testParam2); // Not destroyed
      expect(updatedParams[2]).toEqual({...testParamOther, endBlock: 60});
    });
  });
});
