// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {CustomDatasourceTemplate, RuntimeDatasourceTemplate} from '@subql/common-terra/project/versioned';
import {
  SecondLayerTerraHandlerProcessor,
  SubqlTerraCustomDatasource,
  SubqlTerraDatasource,
  SubqlTerraDatasourceKind,
  SubqlTerraHandlerKind,
  SubqlTerraRuntimeDatasource,
} from '@subql/types-terra';
import {gte} from 'semver';

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

export function isTransactionHandlerProcessor<E>(
  hp: SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind, unknown, unknown>
): hp is SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind.Transaction, unknown, E> {
  return hp.baseHandlerKind === SubqlTerraHandlerKind.Transaction;
}

export function isMessageHandlerProcessor<E>(
  hp: SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind, unknown, unknown>
): hp is SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind.Message, unknown, E> {
  return hp.baseHandlerKind === SubqlTerraHandlerKind.Message;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind, unknown, unknown>
): hp is SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === SubqlTerraHandlerKind.Event;
}

export function isTerraTemplates(
  templatesData: any,
  specVersion: string
): templatesData is (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[] {
  return (isRuntimeTerraDs(templatesData[0]) || isCustomTerraDs(templatesData[0])) && gte(specVersion, '1.0.0');
}
