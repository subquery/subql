// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { ProjectManifestVersioned } from '@subql/common';
import { SubqlCustomDatasource } from '@subql/types';
import { SubqueryProject } from '../configure/project.model';
import { isCustomDs } from '../utils/project';
import { DsProcessorService } from './ds-processor.service';

function getTestProject(extraDataSources?: SubqlCustomDatasource[]) {
  return new SubqueryProject(
    new ProjectManifestVersioned({
      specVersion: '0.2.0',
      version: '0.0.0',
      network: {
        genesisHash: '0x',
        endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
      },
      schema: './schema.graphql',
      dataSources: [
        {
          kind: 'substrate/Jsonfy',
          processor: { file: 'contract-processors/dist/jsonfy.js' },
          startBlock: 0,
          mapping: {
            handlers: [
              { handler: 'testSandbox', kind: 'substrate/JsonfyEvent' },
            ],
          },
        },
        ...extraDataSources,
      ],
    } as any),
    path.resolve(__dirname, '../../../'),
  );
}

describe('DsProcessorService', () => {
  let service: DsProcessorService;
  let project: SubqueryProject;

  beforeEach(() => {
    project = getTestProject([]);
    service = new DsProcessorService(project);
  });

  it('can validate custom ds', () => {
    expect(() => service.validateCustomDs()).not.toThrow();
  });

  it('can catch an invalid datasource kind', () => {
    const badDs: SubqlCustomDatasource<string, any> = {
      kind: 'substrate/invalid',
      processor: { file: 'contract-processors/dist/jsonfy.js' },
      assets: {},
      mapping: {
        handlers: [],
      },
    };

    project = getTestProject([badDs]);
    service = new DsProcessorService(project);

    expect(() => service.validateCustomDs()).toThrow();
  });

  it('can run a custom ds processor', () => {
    const ds = project.dataSources[0];

    if (!isCustomDs(ds)) {
      throw new Error('Expected custom data source');
    }

    expect(() => service.getDsProcessor(ds)).not.toThrow();
  });
});
