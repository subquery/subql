// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlKind} from './constants';

export interface ProjectManifest {
  specVersion: string;
  description: string;
  repository: string;

  schema: string;

  endpoint: string;

  dataSources: SubqlDataSource[];
}

export interface SubqlCallFilter {
  module?: string;
  method?: string;
}

export interface SubqlEventFilter {
  module?: string;
  method?: string;
}

export interface SubqlBlockHandler {
  handler: string;
  kind: 'substrate/BlockHandler';
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

export interface SubqlMapping {
  handlers: SubqlHandler[];
}

export interface SubqlDatasource {
  name: string;
  kind: SubqlKind;
  startBlock: number;
  mapping: SubqlMapping;
}

export interface SubqlRuntimeDatasource extends SubqlDatasource {
  kind: SubqlKind.Runtime;
}

export type SubqlDataSource = SubqlRuntimeDatasource;
