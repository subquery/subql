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

export function isEventHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SorobanHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SorobanHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === SorobanHandlerKind.Event;
}

export function isCustomDs(ds: SubqlDatasource): ds is SubqlCustomDatasource<string> {
  return ds.kind !== SorobanDatasourceKind.Runtime && !!(ds as SubqlCustomDatasource<string>).processor;
}

export function isRuntimeDs(ds: SubqlDatasource): ds is SubqlRuntimeDatasource {
  return ds.kind === SorobanDatasourceKind.Runtime;
}
