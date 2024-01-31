// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SecondLayerHandlerProcessor,
  SubstrateCustomDatasource,
  SubstrateDatasource,
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
  SubstrateRuntimeDatasource,
  CustomDatasourceTemplate,
  RuntimeDatasourceTemplate,
  SubstrateMapping,
  SubstrateCustomHandler,
} from '@subql/types';
import {BaseTemplateDataSource} from '@subql/types-core';
import {gte} from 'semver';

export function isBlockHandlerProcessor<F extends Record<string, unknown>, E>(
  hp: SecondLayerHandlerProcessor<SubstrateHandlerKind, F, unknown>
): hp is SecondLayerHandlerProcessor<SubstrateHandlerKind.Block, F, E> {
  return hp.baseHandlerKind === SubstrateHandlerKind.Block;
}

export function isEventHandlerProcessor<F extends Record<string, unknown>, E>(
  hp: SecondLayerHandlerProcessor<SubstrateHandlerKind, F, unknown>
): hp is SecondLayerHandlerProcessor<SubstrateHandlerKind.Event, F, E> {
  return hp.baseHandlerKind === SubstrateHandlerKind.Event;
}

export function isCallHandlerProcessor<F extends Record<string, unknown>, E>(
  hp: SecondLayerHandlerProcessor<SubstrateHandlerKind, F, unknown>
): hp is SecondLayerHandlerProcessor<SubstrateHandlerKind.Call, F, E> {
  return hp.baseHandlerKind === SubstrateHandlerKind.Call;
}

export function isCustomDs<F extends SubstrateMapping<SubstrateCustomHandler>>(
  ds: SubstrateDatasource | BaseTemplateDataSource<SubstrateDatasource>
): ds is SubstrateCustomDatasource<string, F> {
  return ds.kind !== SubstrateDatasourceKind.Runtime && !!(ds as SubstrateCustomDatasource<string, F>).processor;
}

export function isRuntimeDs(ds: SubstrateDatasource): ds is SubstrateRuntimeDatasource {
  return ds.kind === SubstrateDatasourceKind.Runtime;
}

export function isSubstrateTemplates(
  templatesData: any,
  specVersion: string
): templatesData is (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[] {
  return (isRuntimeDs(templatesData[0]) || isCustomDs(templatesData[0])) && gte(specVersion, '0.2.1');
}
