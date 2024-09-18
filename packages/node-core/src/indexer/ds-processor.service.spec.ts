// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {BaseCustomDataSource, BaseDataSource} from '@subql/types-core';
import {GraphQLSchema} from 'graphql';
import {NodeConfig} from '../configure';
import {DsProcessorService} from './ds-processor.service';
import {ISubqueryProject} from './types';

function getTestProject(extraDataSources: BaseCustomDataSource[]): ISubqueryProject {
  return {
    id: 'test',
    root: path.resolve(__dirname, '../../'),
    network: {
      chainId: '0x',
      endpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
    },
    dataSources: [
      {
        kind: 'substrate/Jsonfy',
        processor: {file: 'test/jsonfy.js'},
        startBlock: 1,
        mapping: {
          handlers: [{handler: 'testSandbox', kind: 'substrate/JsonfyEvent'}],
        },
      },
      ...extraDataSources,
    ] as any,
    schema: new GraphQLSchema({}),
    templates: [],
  } as unknown as ISubqueryProject;
}
const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
});

function isCustomDs(ds: BaseDataSource): ds is BaseCustomDataSource {
  return ds.kind.startsWith('substrate/');
}

describe('DsProcessorService', () => {
  let service: DsProcessorService<BaseDataSource>;
  let project: ISubqueryProject;

  beforeEach(() => {
    project = getTestProject([]);
    service = new DsProcessorService(project, {isCustomDs} as any, nodeConfig);
  });

  it('can validate custom ds', async () => {
    await expect(service.validateProjectCustomDatasources(project.dataSources)).resolves.not.toThrow();
  });

  it('can catch an invalid datasource kind', async () => {
    const badDs: BaseCustomDataSource = {
      kind: 'substrate/invalid',
      processor: {file: 'contract-processors/dist/jsonfy.js'},
      assets: new Map([]),
      mapping: {
        file: '',
        handlers: [],
      },
    };

    project = getTestProject([badDs]);
    service = new DsProcessorService(project, {isCustomDs} as any, nodeConfig);

    await expect(service.validateProjectCustomDatasources(project.dataSources)).rejects.toThrow();
  });

  it('can run a custom ds processor', () => {
    const ds = project.dataSources[0];

    if (!isCustomDs(ds)) {
      throw new Error('Expected custom data source');
    }

    expect(() => service.getDsProcessor(ds)).not.toThrow();
  });
});
