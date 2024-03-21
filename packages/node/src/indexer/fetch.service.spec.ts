// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SubstrateBlockHandler,
  SubstrateCallHandler,
  SubstrateDatasource,
  SubstrateDatasourceKind,
  SubstrateEventHandler,
  SubstrateHandlerKind,
  SubstrateRuntimeHandler,
} from '@subql/types';
import { DictionaryQueryEntry } from '@subql/types-core';
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
      null, // UnfinalizedBlocks
      null, // EventEmitter
      null, // SchedulerRegistry
      null, // RuntimeService
    ) as any;
  });

  it('can extract modulos from datasources', () => {
    expect(fetchService.getModulos()).toEqual([5, 2]);
  });
});
