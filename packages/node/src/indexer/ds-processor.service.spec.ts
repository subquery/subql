// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { isCustomDs } from '@subql/common';
import { SubqlCustomDatasource } from '@subql/types';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DsProcessorService } from './ds-processor.service';

function getTestProject(
  extraDataSources?: SubqlCustomDatasource[],
): SubqueryProject {
  return {
    network: {
      genesisHash: '0x',
      endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    },
    dataSources: [
      {
        kind: 'substrate/Jsonfy',
        processor: { file: 'contract-processors/dist/jsonfy.js' },
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [{ handler: 'testSandbox', kind: 'substrate/JsonfyEvent' }],
        },
      },
      ...extraDataSources,
    ] as any,
    id: 'test',
    root: path.resolve(__dirname, '../../../'),
    schema: new GraphQLSchema({}),
  };
}

describe('DsProcessorService', () => {
  let service: DsProcessorService;
  let project: SubqueryProject;

  beforeEach(() => {
    project = getTestProject([]);
    service = new DsProcessorService(project);
  });

  it('can validate custom ds', async () => {
    await service.validateCustomDs();
    await expect(service.validateCustomDs()).resolves.not.toThrow();
  });

  it('can catch an invalid datasource kind', async () => {
    const badDs: SubqlCustomDatasource<string, any> = {
      kind: 'substrate/invalid',
      processor: { file: 'contract-processors/dist/jsonfy.js' },
      assets: new Map([]),
      mapping: {
        handlers: [],
      },
    };

    project = getTestProject([badDs]);
    service = new DsProcessorService(project);

    await expect(service.validateCustomDs()).rejects.toThrow();
  });

  it('can run a custom ds processor', () => {
    const ds = project.dataSources[0];

    if (!isCustomDs(ds)) {
      throw new Error('Expected custom data source');
    }

    expect(() => service.getDsProcessor(ds)).not.toThrow();
  });
});
