// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SecondLayerHandlerProcessor,
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlDatasourceProcessor,
  SubqlHandlerKind,
  SubqlMapping,
  SubqlNetworkFilter,
} from '@subql/types';
import FrontierDatasourcePlugin, {
  FrontierCall,
  FrontierEvent,
  FrontierEventFilter,
  FrontierCallFilter,
  FrontierProcessorOptions,
} from './frontier';

export type MoonbeamCall = FrontierCall;
export type MoonbeamEvent = FrontierEvent;
export type MoonbeamEventFilter = FrontierEventFilter;
export type MoonbeamCallFilter = FrontierCallFilter;

export type MoonbeamDatasource = SubqlCustomDatasource<
  'substrate/Moonbeam',
  SubqlNetworkFilter,
  SubqlMapping<SubqlCustomHandler>,
  FrontierProcessorOptions
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
  validate: FrontierDatasourcePlugin.validate.bind(this),
  dsFilterProcessor(ds: MoonbeamDatasource): boolean {
    return ds.kind === this.kind;
  },
  handlerProcessors: {
    'substrate/MoonbeamEvent': FrontierDatasourcePlugin.handlerProcessors[
      'substrate/FrontierEvent'
    ] as unknown as MoonbeamEventSecondLayerHandlerProcessor,
    'substrate/MoonbeamCall': FrontierDatasourcePlugin.handlerProcessors[
      'substrate/FrontierCall'
    ] as unknown as MoonbeamCallSecondLayerHandlerProcessor,
  },
};
