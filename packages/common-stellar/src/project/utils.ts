// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SecondLayerHandlerProcessor,
  SubqlCustomDatasource,
  SubqlDatasource,
  StellarDatasourceKind,
  StellarHandlerKind,
  SubqlRuntimeDatasource,
  SecondLayerHandlerProcessorArray,
  SubqlCustomHandler,
  SubqlMapping,
} from '@subql/types-stellar';

type DefaultFilter = Record<string, unknown>;

export function isBlockHandlerProcessor<F extends Record<string, unknown>, B>(
  hp: SecondLayerHandlerProcessorArray<StellarHandlerKind, F, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.Block, F, B> {
  return hp.baseHandlerKind === StellarHandlerKind.Block;
}

export function isTransactionHandlerProcessor<F extends Record<string, unknown>, T>(
  hp: SecondLayerHandlerProcessorArray<StellarHandlerKind, F, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.Transaction, F, T> {
  return hp.baseHandlerKind === StellarHandlerKind.Transaction;
}

export function isSorobanTransactionHandlerProcessor<F extends Record<string, unknown>, T>(
  hp: SecondLayerHandlerProcessorArray<StellarHandlerKind, F, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.SorobanTransaction, F, T> {
  return hp.baseHandlerKind === StellarHandlerKind.SorobanTransaction;
}

export function isOperationHandlerProcessor<F extends Record<string, unknown>, O>(
  hp: SecondLayerHandlerProcessorArray<StellarHandlerKind, F, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.Operation, F, O> {
  return hp.baseHandlerKind === StellarHandlerKind.Operation;
}

export function isEffectHandlerProcessor<F extends Record<string, unknown>, E>(
  hp: SecondLayerHandlerProcessorArray<StellarHandlerKind, F, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.Effects, F, E> {
  return hp.baseHandlerKind === StellarHandlerKind.Effects;
}

export function isEventHandlerProcessor<F extends Record<string, unknown>, E>(
  hp: SecondLayerHandlerProcessorArray<StellarHandlerKind, F, unknown>
): hp is SecondLayerHandlerProcessor<StellarHandlerKind.Event, F, E> {
  return hp.baseHandlerKind === StellarHandlerKind.Event;
}

export function isCustomDs<F extends SubqlMapping<SubqlCustomHandler>>(
  ds: SubqlDatasource
): ds is SubqlCustomDatasource<string, F> {
  return ds.kind !== StellarDatasourceKind.Runtime && !!(ds as SubqlCustomDatasource<string>).processor;
}

export function isRuntimeDs(ds: SubqlDatasource): ds is SubqlRuntimeDatasource {
  return ds.kind === StellarDatasourceKind.Runtime;
}
