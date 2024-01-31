// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SubstrateBlockHandler,
  SubstrateCallHandler,
  SubstrateCustomDatasource,
  SubstrateDatasource,
  SubstrateDatasourceKind,
  SubstrateDatasourceProcessor,
  SubstrateEventHandler,
  SubstrateHandlerKind,
  SubstrateRuntimeHandler,
} from '@subql/types';
import { DictionaryQueryEntry } from '@subql/types-core';
import { DsProcessorService } from './ds-processor.service';
import { FetchService } from './fetch.service';
import { ProjectService } from './project.service';

const projectService: ProjectService = {
  getAllDataSources: () => {
    return [
      makeDs([{ ...blockHandler, filter: { modulo: 5 } }]),
      makeDs([callHandler]),
      makeDs([eventHandler, { ...blockHandler, filter: { modulo: 2 } }]),
    ];
  },
} as any;

const dsProcessorService: DsProcessorService = {
  getDsProcessor: (
    ds: SubstrateCustomDatasource,
  ): SubstrateDatasourceProcessor<any, any> => {
    return {
      kind: 'substrate/Jsonfy',
      validate: (ds, assets) => true,
      dsFilterProcessor: (ds, api) => true,
      handlerProcessors: {
        'substrate/JsonfyCall': {
          baseHandlerKind: SubstrateHandlerKind.Call,
          baseFilter: [{ method: '', module: '' }],
          dictionaryQuery: (filter, ds) => {
            return {
              entity: 'json',
              conditions: [
                { field: 'filter1', value: filter.filter1 },
                { field: 'filter2', value: filter.filter2 },
              ],
            };
          },
        } as any,
        'substrate/JsonfyEvent': {
          baseHandlerKind: SubstrateHandlerKind.Event,
          baseFilter: [{ method: 'foo', module: 'bar' }],
        } as any,
      },
    };
  },
} as any;

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

describe('FetchSevice', () => {
  let fetchService: FetchService & {
    buildDictionaryQueryEntries: (
      ds: SubstrateDatasource[],
    ) => DictionaryQueryEntry[]; // This is protected so we expose it here
    getModulos: () => number[];
  };

  beforeEach(() => {
    fetchService = new FetchService(
      null, // ApiService
      null, // NodeConfig
      projectService, // ProjectService
      {} as any, // Project
      null, // BlockDispatcher,
      null, // DictionaryService
      dsProcessorService,
      null, // DynamicDsService
      null, // UnfinalizedBlocks
      null, // EventEmitter
      null, // SchedulerRegistry
      null, // RuntimeService
    ) as any;
  });

  describe('Building dictionary query entries', () => {
    it('supports block handlers', () => {
      /* If there are any blockhandlers without a modulo or timestamp filter we expect no query entries */
      const result1 = fetchService.buildDictionaryQueryEntries([
        makeDs([blockHandler]),
      ]);
      expect(result1).toEqual([]);

      const result2 = fetchService.buildDictionaryQueryEntries([
        makeDs([blockHandler, callHandler, eventHandler]),
      ]);
      expect(result2).toEqual([]);

      const result3 = fetchService.buildDictionaryQueryEntries([
        makeDs([blockHandler]),
        makeDs([callHandler]),
        makeDs([eventHandler]),
      ]);
      expect(result3).toEqual([]);
    });

    it('supports block handlers with modulo filter', () => {
      const result1 = fetchService.buildDictionaryQueryEntries([
        makeDs([
          { ...blockHandler, filter: { modulo: 5 } },
          callHandler,
          eventHandler,
        ]),
      ]);
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
      const result1 = fetchService.buildDictionaryQueryEntries([
        makeDs([{ kind: SubstrateHandlerKind.Call, handler: 'handleCall' }]),
      ]);
      expect(result1).toEqual([]);

      const result2 = fetchService.buildDictionaryQueryEntries([
        makeDs([{ kind: SubstrateHandlerKind.Event, handler: 'handleEvent' }]),
      ]);
      expect(result2).toEqual([]);
    });

    it('supports custom ds processors', () => {
      // Processor WITH custom dictionary query
      const result1 = fetchService.buildDictionaryQueryEntries([
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
      ]);

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
      const result2 = fetchService.buildDictionaryQueryEntries([
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
      ]);

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

  it('can extract modulos from datasources', () => {
    expect(fetchService.getModulos()).toEqual([5, 2]);
  });
});
