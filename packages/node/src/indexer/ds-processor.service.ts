// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import { AnyTuple } from '@polkadot/types-codec/types';
import {
  isCustomDs,
  SubstrateDatasourceProcessor,
} from '@subql/common-substrate';
import { BaseDsProcessorService } from '@subql/node-core';
import {
  SecondLayerHandlerProcessor_0_0_0,
  SecondLayerHandlerProcessor_1_0_0,
  SubstrateCustomDatasource,
  SubstrateCustomHandler,
  SubstrateDatasource,
  SubstrateHandlerKind,
  SubstrateMapping,
} from '@subql/types';

export function isSecondLayerHandlerProcessor_0_0_0<
  K extends SubstrateHandlerKind,
  F extends Record<string, unknown>,
  E,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource,
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<K, F, E, IT, DS>
    | SecondLayerHandlerProcessor_1_0_0<K, F, E, IT, DS>,
): processor is SecondLayerHandlerProcessor_0_0_0<K, F, E, IT, DS> {
  // Exisiting datasource processors had no concept of specVersion, therefore undefined is equivalent to 0.0.0
  return processor.specVersion === undefined;
}

export function isSecondLayerHandlerProcessor_1_0_0<
  K extends SubstrateHandlerKind,
  F extends Record<string, unknown>,
  E,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource,
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<K, F, E, IT, DS>
    | SecondLayerHandlerProcessor_1_0_0<K, F, E, IT, DS>,
): processor is SecondLayerHandlerProcessor_1_0_0<K, F, E, IT, DS> {
  return processor.specVersion === '1.0.0';
}

export function asSecondLayerHandlerProcessor_1_0_0<
  K extends SubstrateHandlerKind,
  F extends Record<string, unknown>,
  E,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource,
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<K, F, E, IT, DS>
    | SecondLayerHandlerProcessor_1_0_0<K, F, E, IT, DS>,
): SecondLayerHandlerProcessor_1_0_0<K, F, E, IT, DS> {
  if (isSecondLayerHandlerProcessor_1_0_0(processor)) {
    return processor;
  }

  if (!isSecondLayerHandlerProcessor_0_0_0(processor)) {
    throw new Error('Unsupported ds processor version');
  }

  return {
    ...processor,
    specVersion: '1.0.0',
    filterProcessor: (params) =>
      processor.filterProcessor(params.filter, params.input, params.ds),
    transformer: (params) =>
      processor
        .transformer(params.input, params.ds, params.api, params.assets)
        .then((res) => [res]),
  };
}

@Injectable()
export class DsProcessorService extends BaseDsProcessorService<
  SubstrateDatasource,
  SubstrateCustomDatasource<string, SubstrateMapping<SubstrateCustomHandler>>,
  SubstrateDatasourceProcessor<string, Record<string, unknown>>
> {
  protected isCustomDs = isCustomDs;
}
