// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isCustomDs} from '@subql/common-substrate';
import {
  SubstrateBlockHandler,
  SubstrateCallHandler,
  SubstrateDatasource,
  SubstrateDatasourceKind,
  SubstrateEventHandler,
  SubstrateHandlerKind,
  SubstrateRuntimeHandler,
} from '@subql/types';
import {BaseCustomDataSource} from '@subql/types-core';
import {getModulos} from './project';

const blockHandler: SubstrateBlockHandler = {
  kind: SubstrateHandlerKind.Block,
  handler: 'handleBlock',
};
const callHandler: SubstrateCallHandler = {
  kind: SubstrateHandlerKind.Call,
  handler: 'handleCall',
  filter: {method: 'call', module: 'module'},
};
const eventHandler: SubstrateEventHandler = {
  kind: SubstrateHandlerKind.Event,
  handler: 'handleEvent',
  filter: {method: 'event', module: 'module'},
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

describe('Project Utils', () => {
  it('gets the correct modulos', () => {
    const modulos = getModulos<SubstrateDatasource, BaseCustomDataSource>(
      [
        makeDs([{...blockHandler, filter: {modulo: 5}}]),
        makeDs([callHandler]),
        makeDs([eventHandler, {...blockHandler, filter: {modulo: 2}}]),
      ],
      isCustomDs,
      SubstrateHandlerKind.Block
    );

    expect(modulos).toEqual([5, 2]);
  });
});
