// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NodeConfig } from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DictionaryService } from './dictionary.service';

function testSubqueryProject(): SubqueryProject {
  return new SubqueryProject(
    'test',
    './',
    {
      endpoint: '',
      dictionary: `https://api.subquery.network/sq/subquery/moonbeam-dictionary`,
      chainId: '',
    },
    [],
    new GraphQLSchema({}),
    [],
  );
}
const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  networkEndpoint: ['wss://moonbeam.api.onfinality.io/public-ws'],
  dictionaryTimeout: 10,
});

describe('DictionaryService', () => {
  it('should return all specVersion', async () => {
    const project = testSubqueryProject();
    const dictionaryService = new DictionaryService(project, nodeConfig);

    const specVersions = await dictionaryService.getSpecVersions();

    expect(specVersions.length).toBeGreaterThan(0);
  }, 500000);
});
