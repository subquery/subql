// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SecondLayerHandlerProcessor,
  SubqlCustomDatasource,
  SubqlDatasource,
  AvalancheDatasourceKind,
  AvalancheHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-avalanche';

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<AvalancheHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<AvalancheHandlerKind.Block, unknown, E> {
  return hp.baseHandlerKind === AvalancheHandlerKind.Block;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<AvalancheHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<AvalancheHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === AvalancheHandlerKind.Event;
}

export function isCallHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<AvalancheHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<AvalancheHandlerKind.Call, unknown, E> {
  return hp.baseHandlerKind === AvalancheHandlerKind.Call;
}

export function isCustomDs(ds: SubqlDatasource): ds is SubqlCustomDatasource<string> {
  return ds.kind !== AvalancheDatasourceKind.Runtime && !!(ds as SubqlCustomDatasource<string>).processor;
}

export function isRuntimeDs(ds: SubqlDatasource): ds is SubqlRuntimeDatasource {
  return ds.kind === AvalancheDatasourceKind.Runtime;
}
