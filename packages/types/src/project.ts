// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {RegistryTypes} from '@polkadot/types/types';
import {SubstrateBlock, SubstrateEvent, SubstrateExtrinsic} from './interfaces';

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

export interface HandlerInputTransformer<
  T extends SubstrateHandlerKind,
  U,
  F,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> {
  (params: {
    input: RuntimeHandlerInputMap[T];
    ds: DS;
    filter?: F;
    api: ApiPromise;
    assets?: Record<string, string>;
  }): Promise<U[]>; //  | SubstrateBuiltinDataSource
}

export interface SubstrateDatasourceProcessor<
  K extends string,
  F extends SubstrateNetworkFilter,
  DS extends SubstrateCustomDatasource<K, F> = SubstrateCustomDatasource<K, F>
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: ApiPromise): boolean;
  handlerProcessors: {[kind: string]: SecondLayerHandlerProcessor<SubstrateHandlerKind, unknown, unknown, DS>};
}

export interface DictionaryQueryCondition {
  field: string;
  value: string;
}

export interface DictionaryQueryEntry {
  entity: string;
  conditions: DictionaryQueryCondition[];
}

// only allow one custom handler for each baseHandler kind
export interface SecondLayerHandlerProcessor<
  K extends SubstrateHandlerKind,
  F,
  E,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: RuntimeFilterMap[K] | RuntimeFilterMap[K][];
  transformer: HandlerInputTransformer<K, E, F, DS>;
  filterProcessor: (params: {filter: F | undefined; input: RuntimeHandlerInputMap[K]; ds: DS}) => boolean;
  filterValidator: (filter?: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry | undefined;
}
