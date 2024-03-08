// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodeConfig } from '@subql/node-core';
import {
  SubstrateBlockHandler,
  SubstrateCallHandler,
  SubstrateDatasourceKind,
  SubstrateEventHandler,
  SubstrateHandlerKind,
  SubstrateRuntimeHandler,
} from '@subql/types';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../../../configure/SubqueryProject';
import { DsProcessorService } from '../../ds-processor.service';
import { SubstrateDictionaryService } from '../substrateDictionary.service';
import { buildDictionaryV1QueryEntries } from './substrateDictionaryV1';

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
    dictionaryService.onApplicationShutdown();
  }, 500000);
});

const makeDs = (handlers: SubstrateRuntimeHandler[]) => {
  return {
    name: '',
    kind: SubstrateDatasourceKind.Runtime,
    mapping: {
      file: '',
      handlers,
    },
  };
};
const blockHandler: SubstrateBlockHandler = {
  kind: SubstrateHandlerKind.Block,
  handler: 'handleBlock',
};
const callHandler: SubstrateCallHandler = {
  kind: SubstrateHandlerKind.Call,
  handler: 'handleCall',
  filter: { method: 'call', module: 'module' },
};
const eventHandler: SubstrateEventHandler = {
  kind: SubstrateHandlerKind.Event,
  handler: 'handleEvent',
  filter: { method: 'event', module: 'module' },
};

describe('Building dictionary query entries', () => {
  it('supports block handlers', () => {
    /* If there are any blockhandlers without a modulo or timestamp filter we expect no query entries */
    const result1 = buildDictionaryV1QueryEntries(
      [makeDs([blockHandler])],
      () => undefined,
    );
    expect(result1).toEqual([]);

    const result2 = buildDictionaryV1QueryEntries(
      [makeDs([blockHandler, callHandler, eventHandler])],
      () => undefined,
    );
    expect(result2).toEqual([]);

    const result3 = buildDictionaryV1QueryEntries(
      [makeDs([blockHandler]), makeDs([callHandler]), makeDs([eventHandler])],
      () => undefined,
    );
    expect(result3).toEqual([]);
  });

  it('supports block handlers with modulo filter', () => {
    const result1 = buildDictionaryV1QueryEntries(
      [
        makeDs([
          { ...blockHandler, filter: { modulo: 5 } },
          callHandler,
          eventHandler,
        ]),
      ],
      () => undefined,
    );
    expect(result1).toEqual([
      {
        entity: 'extrinsics',
        conditions: [
          { field: 'call', value: 'call' },
          { field: 'module', value: 'module' },
        ],
      },
      {
        entity: 'events',
        conditions: [
          { field: 'module', value: 'module' },
          { field: 'event', value: 'event' },
        ],
      },
    ]);
  });

  it('supports any handler with no filters', () => {
    const result1 = buildDictionaryV1QueryEntries(
      [makeDs([{ kind: SubstrateHandlerKind.Call, handler: 'handleCall' }])],
      () => undefined,
    );
    expect(result1).toEqual([]);

    const result2 = buildDictionaryV1QueryEntries(
      [makeDs([{ kind: SubstrateHandlerKind.Event, handler: 'handleEvent' }])],
      () => undefined,
    );
    expect(result2).toEqual([]);
  });

  it('supports custom ds processors', () => {
    // Processor WITH custom dictionary query
    const result1 = buildDictionaryV1QueryEntries(
      [
        {
          kind: 'substrate/Jsonfy',
          processor: { file: '' },
          assets: new Map(),
          mapping: {
            file: '',
            handlers: [
              {
                kind: 'substrate/JsonfyCall',
                handler: 'handleCall',
                filter: {
                  filter1: 'foo',
                  filter2: 'bar',
                },
              },
            ],
          },
        },
      ],
      () => undefined,
    );

    expect(result1).toEqual([
      {
        entity: 'json',
        conditions: [
          { field: 'filter1', value: 'foo' },
          { field: 'filter2', value: 'bar' },
        ],
      },
    ]);

    // Processor WITHOUT custom dictionary query
    const result2 = buildDictionaryV1QueryEntries(
      [
        {
          kind: 'substrate/Jsonfy',
          processor: { file: '' },
          assets: new Map(),
          mapping: {
            file: '',
            handlers: [
              {
                kind: 'substrate/JsonfyEvent',
                handler: 'handleEvent',
                filter: {
                  filter1: 'foo',
                  filter2: 'bar',
                },
              },
            ],
          },
        },
      ],
      () => undefined,
    );

    expect(result2).toEqual([
      {
        entity: 'events',
        conditions: [
          { field: 'module', value: 'bar' },
          { field: 'event', value: 'foo' },
        ],
      },
    ]);
  });
});
