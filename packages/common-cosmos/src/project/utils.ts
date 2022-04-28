// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SecondLayerCosmosHandlerProcessor,
  SubqlCosmosCustomDatasource,
  SubqlCosmosDatasource,
  SubqlCosmosDatasourceKind,
  SubqlCosmosHandlerKind,
  SubqlCosmosRuntimeDatasource,
} from '@subql/types-cosmos';

export function isCustomCosmosDs(ds: SubqlCosmosDatasource): ds is SubqlCosmosCustomDatasource<string> {
  return ds.kind !== SubqlCosmosDatasourceKind.Runtime && !!(ds as SubqlCosmosCustomDatasource<string>).processor;
}

export function isRuntimeCosmosDs(ds: SubqlCosmosDatasource): ds is SubqlCosmosRuntimeDatasource {
  return ds.kind === SubqlCosmosDatasourceKind.Runtime;
}

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerCosmosHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerCosmosHandlerProcessor<SubqlCosmosHandlerKind.Block, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Block;
}

export function isTransactionHandlerProcessor<E>(
  hp: SecondLayerCosmosHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerCosmosHandlerProcessor<SubqlCosmosHandlerKind.Transaction, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Transaction;
}

export function isMessageHandlerProcessor<E>(
  hp: SecondLayerCosmosHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerCosmosHandlerProcessor<SubqlCosmosHandlerKind.Message, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Message;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerCosmosHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerCosmosHandlerProcessor<SubqlCosmosHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Event;
}
