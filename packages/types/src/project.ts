// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {RegistryTypes} from '@polkadot/types/types';
import {SubstrateBlock, SubstrateEvent, SubstrateExtrinsic} from './interfaces';

export enum SubqlDatasourceKind {
  Runtime = 'substrate/Runtime',
}

export enum SubqlHandlerKind {
  Block = 'substrate/BlockHandler',
  Call = 'substrate/CallHandler',
  Event = 'substrate/EventHandler',
}

export type RuntimeHandlerInputMap = {
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

  dataSources: SubqlDatasource[];
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

export interface SubqlCustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export type SubqlRuntimeHandler = SubqlBlockHandler | SubqlCallHandler | SubqlEventHandler;

export type SubqlHandler = SubqlRuntimeHandler | SubqlCustomHandler<string, unknown>;

export type SubqlHandlerFilter = SubqlBlockFilter | SubqlCallFilter | SubqlEventFilter;

export interface SubqlMapping<T extends SubqlHandler = SubqlHandler> {
  handlers: T[];
}

interface ISubqlDatasource<M extends SubqlMapping, F extends SubqlNetworkFilter = SubqlNetworkFilter> {
  name?: string;
  kind: string;
  filter?: F;
  startBlock?: number;
  mapping: M;
}

export interface SubqlRuntimeDatasource<M extends SubqlMapping<SubqlRuntimeHandler> = SubqlMapping<SubqlRuntimeHandler>>
  extends ISubqlDatasource<M> {
  kind: SubqlDatasourceKind.Runtime;
}

export interface SubqlNetworkFilter {
  specName?: string;
}

export type SubqlDatasource = SubqlRuntimeDatasource | SubqlCustomDatasource; // | SubqlBuiltinDataSource;

export interface FileReference {
  file: string;
}

export type CustomDataSourceAsset = FileReference;

export type Processor<O = any> = FileReference & {options?: O};

export interface SubqlCustomDatasource<
  K extends string = string,
  T extends SubqlNetworkFilter = SubqlNetworkFilter,
  M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>,
  O = any
> extends ISubqlDatasource<M, T> {
  kind: K;
  assets: Map<string, CustomDataSourceAsset>;
  processor: Processor<O>;
}

//export type SubqlBuiltinDataSource = ISubqlDatasource;

export interface HandlerInputTransformer<
  T extends SubqlHandlerKind,
  U,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> {
  (original: RuntimeHandlerInputMap[T], ds: DS, api: ApiPromise, assets: Record<string, string>): Promise<U>; //  | SubqlBuiltinDataSource
}

export interface SubqlDatasourceProcessor<
  K extends string,
  F extends SubqlNetworkFilter,
  DS extends SubqlCustomDatasource<K, F> = SubqlCustomDatasource<K, F>
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: ApiPromise): boolean;
  handlerProcessors: {[kind: string]: SecondLayerHandlerProcessor<SubqlHandlerKind, unknown, unknown, DS>};
}

// interface DictionaryQuery {
//   entity: string;
//   conditions: {field: string; value: string}[];
// }

// only allow one custom handler for each baseHandler kind
export interface SecondLayerHandlerProcessor<
  K extends SubqlHandlerKind,
  F,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: RuntimeFilterMap[K] | RuntimeFilterMap[K][];
  transformer: HandlerInputTransformer<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: RuntimeHandlerInputMap[K], ds: DS) => boolean;
  filterValidator: (filter: F) => void;
  // dictionaryQuery: (filter: F) => DictionaryQuery;
}
