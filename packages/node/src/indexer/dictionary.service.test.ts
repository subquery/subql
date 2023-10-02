// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
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
    const dictionaryService = new DictionaryService(
      project,
      nodeConfig,
      new EventEmitter2(),
    );

    const specVersions = await dictionaryService.getSpecVersions();

    expect(specVersions.length).toBeGreaterThan(0);
  }, 500000);

  it('not use dictionary if endpoint genesisHash is not match with metadata', async () => {
    const project = testSubqueryProject();
    const dictionaryService = new DictionaryService(
      project,
      nodeConfig,
      new EventEmitter2(),
    );
    (dictionaryService as any).getMetadata = jest
      .fn()
      .mockImplementation(() => {
        return {
          lastProcessedHeight: 48208794,
          genesisHash:
            '0xa9c28ce2141b56c474f1dc504bee9b01eb1bd7d1a507580d5519d4437a97de1b',
          startHeight: 1,
        };
      });
    await expect(dictionaryService.initValidation('0xfake')).resolves.toBe(
      false,
    );
  });
});
