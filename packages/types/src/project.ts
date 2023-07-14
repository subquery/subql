// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiWrapper} from './interfaces';
import {SorobanEvent, SorobanEventFilter} from './soroban';

export enum SorobanDatasourceKind {
  Runtime = 'soroban/Runtime',
}

export enum SorobanHandlerKind {
  Event = 'soroban/EventHandler',
}

export type SorobanRuntimeHandlerInputMap = {
  [SorobanHandlerKind.Event]: SorobanEvent;
};

type SorobanRuntimeFilterMap = {
  [SorobanHandlerKind.Event]: SorobanEventFilter;
};

export interface ProjectManifest {
  specVersion: string;
  description: string;
  repository: string;

  schema: string;

  network: {
    endpoint: string | string[];
  };

  dataSources: SubqlDatasource[];
  bypassBlocks?: number[];
}

export interface SubqlEventHandler {
  handler: string;
  kind: SorobanHandlerKind.Event;
  filter?: SorobanEventFilter;
}

export interface SubqlCustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export type SubqlRuntimeHandler = SubqlEventHandler;

export type SubqlHandler = SubqlRuntimeHandler | SubqlCustomHandler<string, unknown>;

export type SubqlHandlerFilter = SorobanEventFilter;

export interface SubqlMapping<T extends SubqlHandler = SubqlHandler> {
  file: string;
  handlers: T[];
}

interface ISubqlDatasource<M extends SubqlMapping> {
  name?: string;
  kind: string;
  startBlock?: number;
  mapping: M;
}

export interface SubqlSorobanProcessorOptions {
  abi?: string;
  address?: string;
}

export interface SubqlRuntimeDatasource<M extends SubqlMapping<SubqlRuntimeHandler> = SubqlMapping<SubqlRuntimeHandler>>
  extends ISubqlDatasource<M> {
  kind: SorobanDatasourceKind.Runtime;
  options?: SubqlSorobanProcessorOptions;
  assets?: Map<string, {file: string}>;
}

export interface SubqlNetworkFilter {
  specName?: string;
}

export type SubqlDatasource = SubqlRuntimeDatasource | SubqlCustomDatasource;

export interface FileReference {
  file: string;
}

export type CustomDataSourceAsset = FileReference;

export type Processor<O = any> = FileReference & {options?: O};

export interface SubqlCustomDatasource<
  K extends string = string,
  M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>,
  O = any
> extends ISubqlDatasource<M> {
  kind: K;
  assets: Map<string, CustomDataSourceAsset>;
  options?: SubqlSorobanProcessorOptions;
  processor: Processor<O>;
}

export interface HandlerInputTransformer_0_0_0<
  T extends SorobanHandlerKind,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> {
  (input: SorobanRuntimeHandlerInputMap[T], ds: DS, api: ApiWrapper, assets?: Record<string, string>): Promise<E>; //  | SubstrateBuiltinDataSource
}

export interface HandlerInputTransformer_1_0_0<
  T extends SorobanHandlerKind,
  F,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> {
  (params: {
    input: SorobanRuntimeHandlerInputMap[T];
    ds: DS;
    filter?: F;
    api: ApiWrapper;
    assets?: Record<string, string>;
  }): Promise<E[]>; //  | SubstrateBuiltinDataSource
}

export interface DictionaryQueryCondition {
  field: string;
  value: string | string[];
  matcher?: string;
}

export interface DictionaryQueryEntry {
  entity: string;
  conditions: DictionaryQueryCondition[];
}

export type SecondLayerHandlerProcessorArray<
  K extends string,
  F,
  T,
  DS extends SubqlCustomDatasource<K> = SubqlCustomDatasource<K>
> = SecondLayerHandlerProcessor<SorobanHandlerKind.Event, F, T, DS>;

export interface SubqlDatasourceProcessor<
  K extends string,
  F,
  DS extends SubqlCustomDatasource<K> = SubqlCustomDatasource<K>,
  P extends Record<string, SecondLayerHandlerProcessorArray<K, F, any, DS>> = Record<
    string,
    SecondLayerHandlerProcessorArray<K, F, any, DS>
  >
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: ApiWrapper): boolean;
  handlerProcessors: P;
}

interface SecondLayerHandlerProcessorBase<
  K extends SorobanHandlerKind,
  F,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: SorobanRuntimeFilterMap[K] | SorobanRuntimeFilterMap[K][];
  filterValidator: (filter?: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry | undefined;
}

export interface SecondLayerHandlerProcessor_0_0_0<
  K extends SorobanHandlerKind,
  F,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: undefined;
  transformer: HandlerInputTransformer_0_0_0<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: SorobanRuntimeHandlerInputMap[K], ds: DS) => boolean;
}

export interface SecondLayerHandlerProcessor_1_0_0<
  K extends SorobanHandlerKind,
  F,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: '1.0.0';
  transformer: HandlerInputTransformer_1_0_0<K, F, E, DS>;
  filterProcessor: (params: {filter: F | undefined; input: SorobanRuntimeHandlerInputMap[K]; ds: DS}) => boolean;
}

export type SecondLayerHandlerProcessor<
  K extends SorobanHandlerKind,
  F,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> = SecondLayerHandlerProcessor_0_0_0<K, F, E, DS> | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>;
