// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SecondLayerHandlerProcessor,
  SubstrateCustomDataSource,
  SubstrateDataSource,
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
  SubstrateNetworkFilter,
  SubstrateRuntimeDataSource,
} from './types';

export function isBlockHandlerProcessor<T extends SubstrateNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<SubstrateHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<SubstrateHandlerKind.Block, T, E> {
  return hp.baseHandlerKind === SubstrateHandlerKind.Block;
}

export function isEventHandlerProcessor<T extends SubstrateNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<SubstrateHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<SubstrateHandlerKind.Event, T, E> {
  return hp.baseHandlerKind === SubstrateHandlerKind.Event;
}

export function isCallHandlerProcessor<T extends SubstrateNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<SubstrateHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<SubstrateHandlerKind.Call, T, E> {
  return hp.baseHandlerKind === SubstrateHandlerKind.Call;
}

export function isCustomDs<F extends SubstrateNetworkFilter>(
  ds: SubstrateDataSource
): ds is SubstrateCustomDataSource<string, F> {
  return ds.kind !== SubstrateDatasourceKind.Runtime && !!(ds as SubstrateCustomDataSource<string, F>).processor;
}

export function isRuntimeDs(ds: SubstrateDataSource): ds is SubstrateRuntimeDataSource {
  return ds.kind === SubstrateDatasourceKind.Runtime;
}
