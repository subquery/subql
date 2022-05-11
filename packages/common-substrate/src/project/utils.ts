// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {CustomDatasourceTemplate, RuntimeDatasourceTemplate} from '@subql/common-substrate/project/versioned';
import {gte} from 'semver';
import {
  SecondLayerHandlerProcessor,
  SubstrateCustomDatasource,
  SubstrateDatasource,
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
  SubstrateNetworkFilter,
  SubstrateRuntimeDatasource,
} from '@subql/types';

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
  ds: SubstrateDatasource
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
