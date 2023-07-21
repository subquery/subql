// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NodeConfig } from '@subql/node-core';
import {
  SorobanDatasourceKind,
  SorobanHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-soroban';
import { GraphQLSchema } from 'graphql';
import {
  SubqlProjectDsTemplate,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { buildDictionaryQueryEntries, FetchService } from './fetch.service';

const HTTP_ENDPOINT = 'https://rpc-futurenet.stellar.org:443';

function testSubqueryProject(endpoint: string, ds: any): SubqueryProject {
  return {
    network: {
      endpoint,
      chainId: '1',
    },
    dataSources: ds as any,
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: null,
  };
}

describe('Dictioanry queries', () => {
  describe('Correct dictionary query with dynamic ds', () => {
    it('Build correct counter increment single query', () => {
      const ds: SubqlRuntimeDatasource = {
        kind: SorobanDatasourceKind.Runtime,
        assets: new Map(),
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleDyanmicDs',
              kind: SorobanHandlerKind.Event,
              filter: {
                topics: ['COUNTER'],
              },
            },
          ],
        },
      };
      const result = buildDictionaryQueryEntries([ds], 1);
      expect(result).toEqual([
        {
          entity: 'events',
          conditions: [
            {
              field: 'topics0',
              value: 'COUNTER',
              matcher: 'equalTo',
            },
          ],
        },
      ]);
    });
  });
});
