// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlKind} from './constants';

export interface IProjectManifest<M extends SubqlMapping = SubqlMapping> {
  specVersion: string;
  description: string;
  repository: string;
  dataSources: SubqlDataSource<M>[];
}

export interface ProjectNetworkConfig {
  endpoint: string;
  dictionary?: string;
  genesisHash?: string;
}

// [startSpecVersion?, endSpecVersion?] closed range
export type SpecVersionRange = [number, number];

interface SubqlBaseHandlerFilter {
  specVersion?: SpecVersionRange;
}

export type SubqlBlockFilter = SubqlBaseHandlerFilter;

export interface SubqlEventFilter extends SubqlBaseHandlerFilter {
  module?: string;
  method?: string;
}

export interface SubqlCallFilter extends SubqlEventFilter {
  success?: boolean;
}

export interface SubqlBlockHandler {
  handler: string;
  kind: 'substrate/BlockHandler';
  filter?: SubqlBlockFilter;
}

export interface SubqlCallHandler {
  handler: string;
  kind: 'substrate/CallHandler';
  filter?: SubqlCallFilter;
}

export interface SubqlEventHandler {
  handler: string;
  kind: 'substrate/EventHandler';
  filter?: SubqlEventFilter;
}

export type SubqlHandler = SubqlBlockHandler | SubqlCallHandler | SubqlEventHandler;

export type SubqlHandlerFilter = SubqlBlockFilter | SubqlCallFilter | SubqlEventFilter;

export interface SubqlMapping {
  handlers: SubqlHandler[];
}

export interface SubqlDatasource<M extends SubqlMapping> {
  kind: SubqlKind;
  startBlock?: number;
  mapping: M;
}

export interface SubqlRuntimeDatasource<M extends SubqlMapping = SubqlMapping> extends SubqlDatasource<M> {
  kind: SubqlKind.Runtime;
}

export interface SubqlNetworkFilter {
  specName: string;
}

export type SubqlDataSource<M extends SubqlMapping = SubqlMapping> = SubqlRuntimeDatasource<M>;
