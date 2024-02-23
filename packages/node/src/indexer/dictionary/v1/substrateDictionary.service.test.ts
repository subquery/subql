// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodeConfig } from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../../../configure/SubqueryProject';
import { DsProcessorService } from '../../ds-processor.service';
import { SubstrateDictionaryService } from '../substrateDictionary.service';

function testSubqueryProject(): SubqueryProject {
  return new SubqueryProject(
    'test',
    './',
    {
      endpoint: '',
      chainId:
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    },
    [],
    new GraphQLSchema({}),
    [],
  );
}
const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  dictionaryTimeout: 10,
  dictionaryResolver: 'https://kepler-auth.subquery.network',
});

describe('DictionaryService', () => {
  it('should return all specVersion', async () => {
    const project = testSubqueryProject();
    const dictionaryService = new SubstrateDictionaryService(
      project,
      nodeConfig,
      new EventEmitter2(),
      new DsProcessorService(project, nodeConfig),
    );

    // prepare dictionary service
    await dictionaryService.initDictionaries();
    // mock set dictionary (without ds)
    (dictionaryService as any)._currentDictionaryIndex = 0;

    const specVersions = await dictionaryService.getSpecVersions();

    expect(specVersions.length).toBeGreaterThan(0);
  }, 500000);
});
