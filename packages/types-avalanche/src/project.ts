// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {RegistryTypes} from '@polkadot/types/types';
import {SubstrateBlock, SubstrateEvent, SubstrateExtrinsic} from './substrate';

export enum SubstrateDatasourceKind {
  Runtime = 'substrate/Runtime',
}

export enum SubstrateHandlerKind {
  Block = 'substrate/BlockHandler',
  Call = 'substrate/CallHandler',
  Event = 'substrate/EventHandler',
}

export type RuntimeHandlerInputMap = {
  [SubstrateHandlerKind.Block]: SubstrateBlock;
  [SubstrateHandlerKind.Event]: SubstrateEvent;
  [SubstrateHandlerKind.Call]: SubstrateExtrinsic;
};

type RuntimeFilterMap = {
  [SubstrateHandlerKind.Block]: SubstrateNetworkFilter;
  [SubstrateHandlerKind.Event]: SubstrateEventFilter;
  [SubstrateHandlerKind.Call]: SubstrateCallFilter;
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

  dataSources: SubstrateDatasource[];
}

// [startSpecVersion?, endSpecVersion?] closed range
export type SpecVersionRange = [number, number];

interface SubstrateBaseHandlerFilter {
  specVersion?: SpecVersionRange;
}

export type SubstrateBlockFilter = SubstrateBaseHandlerFilter;

export interface SubstrateEventFilter extends SubstrateBaseHandlerFilter {
  module?: string;
  method?: string;
}

export interface SubstrateCallFilter extends SubstrateEventFilter {
  success?: boolean;
}

export type SubstrateBlockHandler = SubstrateCustomHandler<SubstrateHandlerKind.Block, SubstrateBlockFilter>;
export type SubstrateCallHandler = SubstrateCustomHandler<SubstrateHandlerKind.Call, SubstrateCallFilter>;
export type SubstrateEventHandler = SubstrateCustomHandler<SubstrateHandlerKind.Event, SubstrateEventFilter>;

export interface SubstrateCustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export type SubstrateRuntimeHandler = SubstrateBlockHandler | SubstrateCallHandler | SubstrateEventHandler;
export type SubstrateHandler = SubstrateRuntimeHandler | SubstrateCustomHandler<string, unknown>;
export type SubstrateRuntimeHandlerFilter = SubstrateBlockFilter | SubstrateCallFilter | SubstrateEventFilter;

export interface SubstrateMapping<T extends SubstrateHandler = SubstrateHandler> extends FileReference {
  handlers: T[];
}

interface ISubstrateDatasource<M extends SubstrateMapping, F extends SubstrateNetworkFilter = SubstrateNetworkFilter> {
  name?: string;
  kind: string;
  filter?: F;
  startBlock?: number;
  mapping: M;
}

export interface SubstrateRuntimeDatasource<
  M extends SubstrateMapping<SubstrateRuntimeHandler> = SubstrateMapping<SubstrateRuntimeHandler>
> extends ISubstrateDatasource<M> {
  kind: SubstrateDatasourceKind.Runtime;
}

export interface SubstrateNetworkFilter {
  specName?: string;
}

export type SubstrateDatasource = SubstrateRuntimeDatasource | SubstrateCustomDatasource; // | SubstrateBuiltinDataSource;

export interface FileReference {
  file: string;
}

export type CustomDataSourceAsset = FileReference;

export type Processor<O = any> = FileReference & {options?: O};

export interface SubstrateCustomDatasource<
  K extends string = string,
  T extends SubstrateNetworkFilter = SubstrateNetworkFilter,
  M extends SubstrateMapping = SubstrateMapping<SubstrateCustomHandler>,
  O = any
> extends ISubstrateDatasource<M, T> {
  kind: K;
  assets: Map<string, CustomDataSourceAsset>;
  processor: Processor<O>;
}

//export type SubstrateBuiltinDataSource = ISubstrateDatasource;

export interface HandlerInputTransformer_0_0_0<
  T extends SubstrateHandlerKind,
  E,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> {
  (input: RuntimeHandlerInputMap[T], ds: DS, api: ApiPromise, assets?: Record<string, string>): Promise<E>; //  | SubstrateBuiltinDataSource
}

export interface HandlerInputTransformer_1_0_0<
  T extends SubstrateHandlerKind,
  F,
  E,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> {
  (params: {
    input: RuntimeHandlerInputMap[T];
    ds: DS;
    filter?: F;
    api: ApiPromise;
    assets?: Record<string, string>;
  }): Promise<E[]>; //  | SubstrateBuiltinDataSource
}

type SecondLayerHandlerProcessorArray<
  K extends string,
  F extends SubstrateNetworkFilter,
  T,
  DS extends SubstrateCustomDatasource<K, F> = SubstrateCustomDatasource<K, F>
> =
  | SecondLayerHandlerProcessor<SubstrateHandlerKind.Block, F, T, DS>
  | SecondLayerHandlerProcessor<SubstrateHandlerKind.Call, F, T, DS>
  | SecondLayerHandlerProcessor<SubstrateHandlerKind.Event, F, T, DS>;

export interface SubstrateDatasourceProcessor<
  K extends string,
  F extends SubstrateNetworkFilter,
  DS extends SubstrateCustomDatasource<K, F> = SubstrateCustomDatasource<K, F>,
  P extends Record<string, SecondLayerHandlerProcessorArray<K, F, any, DS>> = Record<
    string,
    SecondLayerHandlerProcessorArray<K, F, any, DS>
  >
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: ApiPromise): boolean;
  handlerProcessors: P;
}

export interface DictionaryQueryCondition {
  field: string;
  value: string;
}

export interface DictionaryQueryEntry {
  entity: string;
  conditions: DictionaryQueryCondition[];
}

interface SecondLayerHandlerProcessorBase<
  K extends SubstrateHandlerKind,
  F,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: RuntimeFilterMap[K] | RuntimeFilterMap[K][];
  filterValidator: (filter?: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry | undefined;
}

// only allow one custom handler for each baseHandler kind
export interface SecondLayerHandlerProcessor_0_0_0<
  K extends SubstrateHandlerKind,
  F,
  E,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: undefined;
  transformer: HandlerInputTransformer_0_0_0<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: RuntimeHandlerInputMap[K], ds: DS) => boolean;
}

export interface SecondLayerHandlerProcessor_1_0_0<
  K extends SubstrateHandlerKind,
  F,
  E,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: '1.0.0';
  transformer: HandlerInputTransformer_1_0_0<K, F, E, DS>;
  filterProcessor: (params: {filter: F | undefined; input: RuntimeHandlerInputMap[K]; ds: DS}) => boolean;
}

export type SecondLayerHandlerProcessor<
  K extends SubstrateHandlerKind,
  F,
  E,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> = SecondLayerHandlerProcessor_0_0_0<K, F, E, DS> | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>;

export enum SubqlDatasourceKind {
  Runtime = 'substrate/Runtime',
  AvalancheRuntime = 'avalanche/Runtime',
}

export enum SubqlHandlerKind {
  Block = 'substrate/BlockHandler',
  Call = 'substrate/CallHandler',
  Event = 'substrate/EventHandler',
}

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
  from?: string;
  to?: string;
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
  assets?: Map<string, {file: string}>;
}

export interface SubqlNetworkFilter {
  specName?: string;
}

export type SubqlDatasource = SubqlRuntimeDatasource | SubqlCustomDatasource; // | SubqlBuiltinDataSource;

export interface FileReference {
  file: string;
}

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
