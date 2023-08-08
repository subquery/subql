// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SecondLayerHandlerProcessor,
  SubqlCustomDatasource,
  SubqlDatasource,
  StellarDatasourceKind,
  StellarHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-stellar';

export function isBlockHandlerProcessor<B>(
  hp: SecondLayerHandlerProcessor<StellarHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.Block, unknown, B> {
  return hp.baseHandlerKind === StellarHandlerKind.Block;
}

export function isTransactionHandlerProcessor<T>(
  hp: SecondLayerHandlerProcessor<StellarHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.Transaction, unknown, T> {
  return hp.baseHandlerKind === StellarHandlerKind.Transaction;
}

export function isOperationHandlerProcessor<O>(
  hp: SecondLayerHandlerProcessor<StellarHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.Operation, unknown, O> {
  return hp.baseHandlerKind === StellarHandlerKind.Operation;
}

export function isEffectHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<StellarHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.Effects, unknown, E> {
  return hp.baseHandlerKind === StellarHandlerKind.Effects;
}

/*
export function isEventHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<StellarHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === StellarHandlerKind.Event;
}
*/

export function isCustomDs(ds: SubqlDatasource): ds is SubqlCustomDatasource<string> {
  return ds.kind !== StellarDatasourceKind.Runtime && !!(ds as SubqlCustomDatasource<string>).processor;
}

export function isRuntimeDs(ds: SubqlDatasource): ds is SubqlRuntimeDatasource {
  return ds.kind === StellarDatasourceKind.Runtime;
}
