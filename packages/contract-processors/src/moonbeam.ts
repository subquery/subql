// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Result} from '@ethersproject/abi';
import {
  SecondLayerHandlerProcessor,
  SubstrateCustomDatasource,
  SubstrateCustomHandler,
  SubstrateDatasourceProcessor,
  SubstrateHandlerKind,
  SubstrateMapping,
  SubstrateNetworkFilter,
} from '@subql/types';
import FrontierEvmDatasourcePlugin, {
  FrontierEvmCall,
  FrontierEvmEvent,
  FrontierEvmEventFilter,
  FrontierEvmCallFilter,
  FrontierEvmProcessorOptions,
} from './frontierEvm';

export type MoonbeamCall<T extends Result = Result> = FrontierEvmCall<T>;
export type MoonbeamEvent<T extends Result = Result> = FrontierEvmEvent<T>;
export type MoonbeamEventFilter = FrontierEvmEventFilter;
export type MoonbeamCallFilter = FrontierEvmCallFilter;

export type MoonbeamDatasource = SubstrateCustomDatasource<
  'substrate/Moonbeam',
  SubstrateNetworkFilter,
  SubstrateMapping<SubstrateCustomHandler>,
  FrontierEvmProcessorOptions
>;

type MoonbeamEventSecondLayerHandlerProcessor = SecondLayerHandlerProcessor<
  SubstrateHandlerKind.Event,
  MoonbeamEventFilter,
  MoonbeamEvent,
  MoonbeamDatasource
>;

type MoonbeamCallSecondLayerHandlerProcessor = SecondLayerHandlerProcessor<
  SubstrateHandlerKind.Call,
  MoonbeamCallFilter,
  MoonbeamCall,
  MoonbeamDatasource
>;

export const MoonbeamDatasourcePlugin: SubstrateDatasourceProcessor<
  'substrate/Moonbeam',
  SubstrateNetworkFilter,
  MoonbeamDatasource
> = {
  kind: 'substrate/Moonbeam',
  validate: FrontierEvmDatasourcePlugin.validate.bind(this),
  dsFilterProcessor(ds: MoonbeamDatasource): boolean {
    return ds.kind === this.kind;
  },
  handlerProcessors: {
    'substrate/MoonbeamEvent': FrontierEvmDatasourcePlugin.handlerProcessors[
      'substrate/FrontierEvmEvent'
    ] as unknown as MoonbeamEventSecondLayerHandlerProcessor,
    'substrate/MoonbeamCall': FrontierEvmDatasourcePlugin.handlerProcessors[
      'substrate/FrontierEvmCall'
    ] as unknown as MoonbeamCallSecondLayerHandlerProcessor,
  },
};

export default MoonbeamDatasourcePlugin;
