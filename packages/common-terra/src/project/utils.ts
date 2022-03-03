// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SecondLayerTerraHandlerProcessor,
  SubqlTerraCustomDatasource,
  SubqlTerraDatasource,
  SubqlTerraDatasourceKind,
  SubqlTerraHandlerKind,
  SubqlTerraRuntimeDatasource,
} from '@subql/types-terra';

export function isCustomTerraDs(ds: SubqlTerraDatasource): ds is SubqlTerraCustomDatasource<string> {
  return ds.kind !== SubqlTerraDatasourceKind.Runtime && !!(ds as SubqlTerraCustomDatasource<string>).processor;
}

export function isRuntimeTerraDs(ds: SubqlTerraDatasource): ds is SubqlTerraRuntimeDatasource {
  return ds.kind === SubqlTerraDatasourceKind.Runtime;
}

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind, unknown, unknown>
): hp is SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind.Block, unknown, E> {
  return hp.baseHandlerKind === SubqlTerraHandlerKind.Block;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind, unknown, unknown>
): hp is SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === SubqlTerraHandlerKind.Event;
}

export function isCallHandlerProcessor<E>(
  hp: SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind, unknown, unknown>
): hp is SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind.Call, unknown, E> {
  return hp.baseHandlerKind === SubqlTerraHandlerKind.Call;
}
