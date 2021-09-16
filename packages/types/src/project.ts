// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {RegistryTypes} from '@polkadot/types/types';
import {SubstrateBlock, SubstrateEvent, SubstrateExtrinsic} from './interfaces';

export enum SubqlKind {
  Runtime = 'substrate/Runtime',
  BlockHandler = 'substrate/BlockHandler',
  CallHandler = 'substrate/CallHandler',
  EventHandler = 'substrate/EventHandler',
}

export enum SubqlDatasourceKind {
  Runtime = 'substrate/Runtime',
  // Custom = 'substrate/Custom',
}

export enum SubqlHandlerKind {
  Block = 'substrate/BlockHandler',
  Call = 'substrate/CallHandler',
  Event = 'substrate/EventHandler',
}

type RuntimeHandlerInputMap = {
  [SubqlHandlerKind.Block]: SubstrateBlock;
  [SubqlHandlerKind.Event]: SubstrateEvent;
  [SubqlHandlerKind.Call]: SubstrateExtrinsic;
};

type RuntimeFilterMap = {
  [SubqlHandlerKind.Block]: SubqlNetworkFilter;
  [SubqlHandlerKind.Event]: SubqlEventFilter;
  [SubqlHandlerKind.Call]: SubqlCallFilter;
};

export interface ProjectManifest {
  specVersion: string;
  description: string;
  repository: string;

  schema: string;

  network: {
    endpoint: string;
    customTypes?: RegistryTypes;
  };

  dataSources: SubqlDataSource[];
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
  kind: SubqlHandlerKind.Block;
  filter?: SubqlBlockFilter;
}

export interface SubqlCallHandler {
  handler: string;
  kind: SubqlHandlerKind.Call;
  filter?: SubqlCallFilter;
}

export interface SubqlEventHandler {
  handler: string;
  kind: SubqlHandlerKind.Event;
  filter?: SubqlEventFilter;
}

export type SubqlHandler = SubqlBlockHandler | SubqlCallHandler | SubqlEventHandler;

export type SubqlHandlerFilter = SubqlBlockFilter | SubqlCallFilter | SubqlEventFilter;

export interface SubqlMapping {
  handlers: SubqlHandler[];
}

interface ISubqlDatasource<M extends SubqlMapping> {
  name: string;
  kind: string;
  filter?: SubqlNetworkFilter;
  startBlock?: number;
  mapping: M;
}

export interface SubqlRuntimeDatasource<M extends SubqlMapping = SubqlMapping> extends ISubqlDatasource<M> {
  kind: SubqlDatasourceKind.Runtime;
}

export interface SubqlNetworkFilter {
  specName: string;
}

export type SubqlDataSource<M extends SubqlMapping = SubqlMapping> = SubqlRuntimeDatasource<M> | SubqlCustomDatasource<string, SubqlNetworkFilter>; // | SubqlBuiltinDataSource;

export interface FileReference {
  file: string;
}

export type CustomDataSourceAsset = FileReference;

export interface SubqlCustomDatasource<K extends string, T extends SubqlNetworkFilter> extends ISubqlDatasource {
  kind: K;
  assets: {[key: string]: CustomDataSourceAsset};
  filter?: T;
  processor: FileReference;
}

//export type SubqlBuiltinDataSource = ISubqlDatasource;

export interface HandlerInputTransformer<T extends SubqlHandlerKind, D extends SubqlNetworkFilter, U> {
  (original: RuntimeHandlerInputMap[T], ds: SubqlCustomDatasource<string, D>): U; //  | SubqlBuiltinDataSource
}

export interface SubqlDatasourcePlugin<K extends string, F extends SubqlNetworkFilter> {
  kind: K;
  validate(ds: SubqlCustomDatasource<K, F>): void;
  dsFilterProcessor(filter: F, api: ApiPromise, ds: SubqlCustomDatasource<K, F>): boolean;
  handlerProcessors: {[kind: string]: SecondLayerHandlerProcessor<SubqlHandlerKind, F, unknown>};
}

// only allow one custom handler for each baseHandler kind
export interface SecondLayerHandlerProcessor<K extends SubqlHandlerKind, F extends SubqlNetworkFilter, E> {
  // kind: string;
  baseHandlerKind: K;
  baseFilter: RuntimeFilterMap[K] | RuntimeFilterMap[K][];
  transformer: HandlerInputTransformer<K, F, E>;
  filterProcessor: (filter: F, input: E, ds: SubqlCustomDatasource<string, F>) => boolean;
}
