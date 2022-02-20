// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0


import FrontierDatasourcePlugin, {
  FrontierCall,
  FrontierDatasource,
  FrontierEvent,
  FrontierEventFilter,
  FrontierCallFilter,
} from './frontier';

export type MoonbeamCall = FrontierCall;
export type MoonbeamEvent = FrontierEvent;
export type MoonbeamDatasource = FrontierDatasource;
export type MoonbeamEventFilter = FrontierEventFilter;
export type MoonbeamCallFilter = FrontierCallFilter;

export default FrontierDatasourcePlugin;
