// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SecondLayerHandlerProcessor,
  SubqlCustomDatasource,
  SubqlDatasource,
  SorobanDatasourceKind,
  SorobanHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-soroban';

export function isBlockHandlerProcessor<B>(
  hp: SecondLayerHandlerProcessor<SorobanHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SorobanHandlerKind.Block, unknown, B> {
  return hp.baseHandlerKind === SorobanHandlerKind.Block;
}

export function isTransactionHandlerProcessor<T>(
  hp: SecondLayerHandlerProcessor<SorobanHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SorobanHandlerKind.Transaction, unknown, T> {
  return hp.baseHandlerKind === SorobanHandlerKind.Transaction;
}

export function isOperationHandlerProcessor<O>(
  hp: SecondLayerHandlerProcessor<SorobanHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SorobanHandlerKind.Operation, unknown, O> {
  return hp.baseHandlerKind === SorobanHandlerKind.Operation;
}

export function isEffectHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SorobanHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SorobanHandlerKind.Effects, unknown, E> {
  return hp.baseHandlerKind === SorobanHandlerKind.Effects;
}

/*
export function isEventHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SorobanHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SorobanHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === SorobanHandlerKind.Event;
}
*/

export function isCustomDs(ds: SubqlDatasource): ds is SubqlCustomDatasource<string> {
  return ds.kind !== SorobanDatasourceKind.Runtime && !!(ds as SubqlCustomDatasource<string>).processor;
}

export function isRuntimeDs(ds: SubqlDatasource): ds is SubqlRuntimeDatasource {
  return ds.kind === SorobanDatasourceKind.Runtime;
}
