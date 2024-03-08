// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { isCustomDs } from '@subql/common-substrate';
import { NodeConfig } from '@subql/node-core';
import { SubstrateCustomDatasource } from '@subql/types';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DsProcessorService } from './ds-processor.service';

function getTestProject(
  extraDataSources?: SubstrateCustomDatasource[],
): SubqueryProject {
  return new SubqueryProject(
    'test',
    path.resolve(__dirname, '../../'),
    {
      chainId: '0x',
      endpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
    },
    [
      {
        kind: 'substrate/Jsonfy',
        processor: { file: 'test/jsonfy.js' },
        startBlock: 1,
        mapping: {
          handlers: [{ handler: 'testSandbox', kind: 'substrate/JsonfyEvent' }],
        },
      },
      ...extraDataSources,
    ] as any,
    new GraphQLSchema({}),
    [],
  );
}
const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
});

describe('DsProcessorService', () => {
  let service: DsProcessorService;
  let project: SubqueryProject;

  beforeEach(() => {
    project = getTestProject([]);
    service = new DsProcessorService(project, nodeConfig);
  });

  it('can validate custom ds', async () => {
    await expect(
      service.validateProjectCustomDatasources(project.dataSources),
    ).resolves.not.toThrow();
  });

  it('can catch an invalid datasource kind', async () => {
    const badDs: SubstrateCustomDatasource<string, any> = {
      kind: 'substrate/invalid',
      processor: { file: 'contract-processors/dist/jsonfy.js' },
      assets: new Map([]),
      mapping: {
        file: '',
        handlers: [],
      },
    };

    project = getTestProject([badDs]);
    service = new DsProcessorService(project, nodeConfig);

    await expect(
      service.validateProjectCustomDatasources(project.dataSources),
    ).rejects.toThrow();
  });

  it('can run a custom ds processor', () => {
    const ds = project.dataSources[0];

    if (!isCustomDs(ds)) {
      throw new Error('Expected custom data source');
    }

    expect(() => service.getDsProcessor(ds)).not.toThrow();
  });
});
