// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SecondLayerHandlerProcessor,
  SubqlCustomDatasource,
  SubqlDatasource,
  SubqlDatasourceKind,
  SubqlHandlerKind,
  SubqlNetworkFilter,
  SubqlRuntimeDatasource,
} from '@subql/types-avalanche';

export function isBlockHandlerProcessor<T extends SubqlNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<SubqlHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<SubqlHandlerKind.Block, T, E> {
  return hp.baseHandlerKind === SubqlHandlerKind.Block;
}

export function isEventHandlerProcessor<T extends SubqlNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<SubqlHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<SubqlHandlerKind.Event, T, E> {
  return hp.baseHandlerKind === SubqlHandlerKind.Event;
}

export function isCallHandlerProcessor<T extends SubqlNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<SubqlHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<SubqlHandlerKind.Call, T, E> {
  return hp.baseHandlerKind === SubqlHandlerKind.Call;
}

export function isCustomDs<F extends SubqlNetworkFilter>(ds: SubqlDatasource): ds is SubqlCustomDatasource<string, F> {
  return ds.kind !== SubqlDatasourceKind.Runtime && !!(ds as SubqlCustomDatasource<string, F>).processor;
}

export function isRuntimeDs(ds: SubqlDatasource): ds is SubqlRuntimeDatasource {
  return ds.kind === SubqlDatasourceKind.Runtime;
}
