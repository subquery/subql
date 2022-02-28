// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Result} from '@ethersproject/abi';
import {
  SecondLayerHandlerProcessor,
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlDatasourceProcessor,
  SubqlHandlerKind,
  SubqlMapping,
  SubqlNetworkFilter,
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

export type MoonbeamDatasource = SubqlCustomDatasource<
  'substrate/Moonbeam',
  SubqlNetworkFilter,
  SubqlMapping<SubqlCustomHandler>,
  FrontierEvmProcessorOptions
>;

type MoonbeamEventSecondLayerHandlerProcessor = SecondLayerHandlerProcessor<
  SubqlHandlerKind.Event,
  MoonbeamEventFilter,
  MoonbeamEvent,
  MoonbeamDatasource
>;

type MoonbeamCallSecondLayerHandlerProcessor = SecondLayerHandlerProcessor<
  SubqlHandlerKind.Call,
  MoonbeamCallFilter,
  MoonbeamCall,
  MoonbeamDatasource
>;

export const MoonbeamDatasourcePlugin: SubqlDatasourceProcessor<
  'substrate/Moonbeam',
  SubqlNetworkFilter,
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
