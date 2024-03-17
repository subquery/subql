// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DatasourceParams, DynamicDsService} from './dynamic-ds.service';
import {CacheMetadataModel} from './storeCache';

class TestDynamicDsService extends DynamicDsService<DatasourceParams> {
  protected async getDatasource(params: DatasourceParams): Promise<DatasourceParams> {
    return Promise.resolve(params);
  }
}

const testParam1 = {templateName: 'Test', startBlock: 1};
const testParam2 = {templateName: 'Test', startBlock: 2};
const testParam3 = {templateName: 'Test', startBlock: 3};
const testParam4 = {templateName: 'Test', startBlock: 4};

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

  beforeEach(() => {
    service = new TestDynamicDsService();
  });

  it('loads all datasources and params when init', async () => {
    await service.init(mockMetadata([testParam1]));

    await expect(service.getDynamicDatasources()).resolves.toEqual([testParam1]);

    expect((service as any)._datasourceParams).toEqual([testParam1]);
  });

  it('keeps reference to added dynamic datasources', async () => {
    const meta = mockMetadata([testParam1]);
    await service.init(meta);

    await service.createDynamicDatasource(testParam2);

    expect((service as any)._datasourceParams).toEqual([testParam1, testParam2]);

    await expect(meta.find('dynamicDatasources')).resolves.toEqual([testParam1, testParam2]);
    await expect(service.getDynamicDatasources()).resolves.toEqual([testParam1, testParam2]);
  });

  it('resets dynamic datasources', async () => {
    const meta = mockMetadata([testParam1, testParam2, testParam3, testParam4]);
    await service.init(meta);

    await service.resetDynamicDatasource(2);

    await expect(meta.find('dynamicDatasources')).resolves.toEqual([testParam1, testParam2]);
    await expect(service.getDynamicDatasources()).resolves.toEqual([testParam1, testParam2]);
  });

  it('getDynamicDatasources with force reloads from metadata', async () => {
    const meta = mockMetadata([testParam1, testParam2]);
    await service.init(meta);

    meta.set('dynamicDatasources', [testParam1, testParam2, testParam3, testParam4]);

    await expect(service.getDynamicDatasources()).resolves.toEqual([testParam1, testParam2]);
    await expect(service.getDynamicDatasources(true)).resolves.toEqual([
      testParam1,
      testParam2,
      testParam3,
      testParam4,
    ]);
    await expect(service.getDynamicDatasources()).resolves.toEqual([testParam1, testParam2, testParam3, testParam4]);
  });
});
