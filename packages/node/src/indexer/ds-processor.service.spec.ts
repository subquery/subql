// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { isCustomDs } from '@subql/common-substrate';
import { SubstrateCustomDatasource } from '@subql/types';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DsProcessorService } from './ds-processor.service';

function getTestProject(
  extraDataSources?: SubstrateCustomDatasource[],
): SubqueryProject {
  return {
    network: {
      genesisHash: '0x',
      endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    },
    dataSources: [
      {
        kind: 'substrate/Jsonfy',
        processor: { file: 'test/jsonfy.js' },
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [{ handler: 'testSandbox', kind: 'substrate/JsonfyEvent' }],
        },
      },
      ...extraDataSources,
    ] as any,
    id: 'test',
    root: path.resolve(__dirname, '../../'),
    schema: new GraphQLSchema({}),
    templates: [],
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
    await expect(
      service.validateProjectCustomDatasources(),
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
    service = new DsProcessorService(project);

    await expect(service.validateProjectCustomDatasources()).rejects.toThrow();
  });

  it('can run a custom ds processor', () => {
    const ds = project.dataSources[0];

    if (!isCustomDs(ds)) {
      throw new Error('Expected custom data source');
    }

    expect(() => service.getDsProcessor(ds)).not.toThrow();
  });
});
