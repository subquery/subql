// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SecondLayerHandlerProcessor,
  SubqlCosmosCustomDatasource,
  SubqlCosmosDatasource,
  SubqlCosmosDatasourceKind,
  SubqlCosmosHandlerKind,
  SubqlCosmosRuntimeDatasource,
} from '@subql/types-cosmos';
import {gte} from 'semver';
import {CustomDatasourceTemplate, RuntimeDatasourceTemplate} from './versioned';

export function isCustomCosmosDs(ds: SubqlCosmosDatasource): ds is SubqlCosmosCustomDatasource<string> {
  return ds.kind !== SubqlCosmosDatasourceKind.Runtime && !!(ds as SubqlCosmosCustomDatasource<string>).processor;
}

export function isRuntimeCosmosDs(ds: SubqlCosmosDatasource): ds is SubqlCosmosRuntimeDatasource {
  return ds.kind === SubqlCosmosDatasourceKind.Runtime;
}

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Block, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Block;
}

export function isTransactionHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Transaction, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Transaction;
}

export function isMessageHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Message, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Message;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Event;
}

export function isCosmosTemplates(
  templatesData: any,
  specVersion: string
): templatesData is (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[] {
  return (isRuntimeCosmosDs(templatesData[0]) || isCustomCosmosDs(templatesData[0])) && gte(specVersion, '0.2.1');
}
