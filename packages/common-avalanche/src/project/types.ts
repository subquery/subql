// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {FileReference, BaseDataSource, BaseHandler, IProjectManifest, ProjectNetworkConfig} from '@subql/common';
import {SubstrateBlock, SubstrateEvent, SubstrateExtrinsic} from '@subql/types-avalanche';
import {RuntimeDataSourceV0_0_1} from '../project/versioned/v0_0_1';

export enum SubstrateDatasourceKind {
  Runtime = 'avalanche/Runtime',
}

export enum SubstrateHandlerKind {
  Block = 'avalanche/BlockHandler',
  Call = 'avalanche/TransactionHandler',
  Event = 'avalanche/LogHandler',
}

export type SubstrateRuntimeHandlerInputMap = {
  [SubstrateHandlerKind.Block]: SubstrateBlock;
  [SubstrateHandlerKind.Event]: SubstrateEvent;
  [SubstrateHandlerKind.Call]: SubstrateExtrinsic;
};

type SubstrateRuntimeFilterMap = {
  [SubstrateHandlerKind.Block]: SubstrateNetworkFilter;
  [SubstrateHandlerKind.Event]: SubstrateEventFilter;
  [SubstrateHandlerKind.Call]: SubstrateCallFilter;
};

//make exception for runtime datasource 0.0.1
export type ISubstrateProjectManifest = IProjectManifest<SubstrateDataSource | RuntimeDataSourceV0_0_1>;

export interface SubstrateProjectNetworkConfig extends ProjectNetworkConfig {
  genesisHash?: string;
  chainId?: string;
  subnet?: string;
}

export type SpecVersionRange = [number, number];

//Record<string,unknown>

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

export type SubstrateRuntimeHandlerFilter = SubstrateBlockFilter | SubstrateCallFilter | SubstrateEventFilter;

export interface SubstrateBlockHandler extends BaseHandler<SubstrateBlockFilter> {
  kind: SubstrateHandlerKind.Block;
}

export interface SubstrateCallHandler extends BaseHandler<SubstrateCallFilter> {
  kind: SubstrateHandlerKind.Call;
}

export interface SubstrateEventHandler extends BaseHandler<SubstrateEventFilter> {
  kind: SubstrateHandlerKind.Event;
}

export type SubstrateHandler = SubstrateRuntimeHandler | SubstrateCustomHandler;

export type SubstrateRuntimeHandler = SubstrateBlockHandler | SubstrateCallHandler | SubstrateEventHandler;

export type SubstrateCustomHandler = BaseHandler<Record<string, unknown>>;

export interface SubstrateNetworkFilter {
  specName?: string;
}

export type SubstrateDataSource = SubstrateRuntimeDataSource | SubstrateCustomDataSource; // | SubqlBuiltinDataSource;

export type SubstrateCustomDataSourceAsset = FileReference;

export interface SubstrateRuntimeDataSource
  extends BaseDataSource<SubstrateRuntimeHandlerFilter, SubstrateRuntimeHandler> {
  kind: SubstrateDatasourceKind.Runtime;
  filter?: SubstrateNetworkFilter; //keep network filter for v0.0.1
  options?: any;
  assets?: Map<string, FileReference>;
}

export type Processor<O = any> = FileReference & {options?: O};

export interface SubstrateCustomDataSource<
  K extends string = string,
  T extends SubstrateNetworkFilter = SubstrateNetworkFilter,
  O = any
> extends BaseDataSource {
  filter?: T;
  kind: K;
  assets: Map<string, SubstrateCustomDataSourceAsset>;
  processor?: Processor<O>;
}

export interface HandlerInputTransformer<
  T extends SubstrateHandlerKind,
  U,
  DS extends SubstrateCustomDataSource = SubstrateCustomDataSource
> {
  (original: SubstrateRuntimeHandlerInputMap[T], ds: DS, api: ApiPromise, assets: Record<string, string>): Promise<U>; //  | SubqlBuiltinDataSource
}

///
export interface SubstrateDatasourceProcessor<
  K extends string,
  F extends SubstrateNetworkFilter,
  DS extends SubstrateCustomDataSource<K, F> = SubstrateCustomDataSource<K, F>
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
  DS extends SubstrateCustomDataSource = SubstrateCustomDataSource
> {
  baseHandlerKind: K;
  baseFilter: SubstrateRuntimeFilterMap[K] | SubstrateRuntimeFilterMap[K][];
  transformer: HandlerInputTransformer<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: SubstrateRuntimeHandlerInputMap[K], ds: DS) => boolean;
  filterValidator: (filter: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry;
}
