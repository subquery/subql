// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource} from '@subql/types-core';
import {IBlockchainService} from '../blockchain.service';
import {DatasourceParams, DynamicDsService} from './dynamic-ds.service';
import {CacheMetadataModel} from './storeCache';
import {ISubqueryProject} from './types';

class TestDynamicDsService extends DynamicDsService<BaseDataSource, ISubqueryProject> {
  constructor(project: ISubqueryProject) {
    super(project, {
      updateDynamicDs: () => Promise.resolve(undefined), // Return the same value
    } as unknown as IBlockchainService);
  }

  // Make it public
  getTemplate<T extends Omit<NonNullable<ISubqueryProject['templates']>[number], 'name'> & {startBlock?: number}>(
    templateName: string,
    startBlock?: number | undefined
  ): T {
    return super.getTemplate(templateName, startBlock);
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
  const project = {
    templates: [{name: 'Test'}],
  } as any as ISubqueryProject;

  beforeEach(() => {
    service = new TestDynamicDsService(project);
  });

  it('loads all datasources and params when init', async () => {
    await service.init(mockMetadata([testParam1]));

    await expect(service.getDynamicDatasources()).resolves.toEqual([
      {/*name: 'Test',*/ startBlock: testParam1.startBlock},
    ]);

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

  it('resets dynamic datasources', async () => {
    const meta = mockMetadata([testParam1, testParam2, testParam3, testParam4]);
    await service.init(meta);

    await service.resetDynamicDatasource(2);

    await expect(meta.find('dynamicDatasources')).resolves.toEqual([testParam1, testParam2]);
    await expect(service.getDynamicDatasources()).resolves.toEqual([
      {startBlock: testParam1.startBlock},
      {startBlock: testParam2.startBlock},
    ]);
  });

  it('getDynamicDatasources with force reloads from metadata', async () => {
    const meta = mockMetadata([testParam1, testParam2]);
    await service.init(meta);

    meta.set('dynamicDatasources', [testParam1, testParam2, testParam3, testParam4]);

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
});
