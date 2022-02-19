// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegistryTypes} from '@polkadot/types/types';
import {Connection} from "@solana/web3.js";
import {SolanaBlock} from './interfaces';

export enum SubqlSolanaDatasourceKind {
  Runtime = 'solana/Runtime',
}

export enum SubqlSolanaHandlerKind {
  Block = 'solana/BlockHandler',
}

export type RuntimeHandlerInputMap = {
  [SubqlSolanaHandlerKind.Block]: SolanaBlock;
};

type RuntimeFilterMap = {
  [SubqlSolanaHandlerKind.Block]: SubqlSolanaNetworkFilter;
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

  dataSources: SubqlSolanaDatasource[];
}

// [startSpecVersion?, endSpecVersion?] closed range
export type SpecVersionRange = [number, number];

interface SubqlSolanaBaseHandlerFilter {
  specVersion?: SpecVersionRange;
}

export type SubqlSolanaBlockFilter = SubqlSolanaBaseHandlerFilter;

export interface SubqlSolanaEventFilter extends SubqlSolanaBaseHandlerFilter {
  module?: string;
  method?: string;
}

export interface SubqlSolanaCallFilter extends SubqlSolanaEventFilter {
  success?: boolean;
}

export interface SubqlSolanaBlockHandler {
  handler: string;
  kind: SubqlSolanaHandlerKind.Block;
  filter?: SubqlSolanaBlockFilter;
}

export interface SubqlSolanaCustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export type SubqlSolanaRuntimeHandler = SubqlSolanaBlockHandler;

export type SubqlSolanaHandler = SubqlSolanaRuntimeHandler | SubqlSolanaCustomHandler<string, unknown>;

export type SubqlSolanaHandlerFilter = SubqlSolanaBlockFilter | SubqlSolanaCallFilter;

export interface SubqlSolanaMapping<T extends SubqlSolanaHandler = SubqlSolanaHandler> {
  file: string;
  handlers: T[];
}

interface ISubqlSolanaDatasource<M extends SubqlSolanaMapping, F extends SubqlSolanaNetworkFilter = SubqlSolanaNetworkFilter> {
  name?: string;
  kind: string;
  filter?: F;
  startBlock?: number;
  mapping: M;
}

export interface SubqlSolanaRuntimeDatasource<M extends SubqlSolanaMapping<SubqlSolanaRuntimeHandler> = SubqlSolanaMapping<SubqlSolanaRuntimeHandler>>
  extends ISubqlSolanaDatasource<M> {
  kind: SubqlSolanaDatasourceKind.Runtime;
}

export interface SubqlSolanaNetworkFilter {
  specName?: string;
}

export type SubqlSolanaDatasource = SubqlSolanaRuntimeDatasource | SubqlSolanaCustomDatasource; // | SubqlSolanaBuiltinDataSource;

export interface FileReference {
  file: string;
}

export type CustomDataSourceAsset = FileReference;

export type Processor<O = any> = FileReference & {options?: O};

export interface SubqlSolanaCustomDatasource<
  K extends string = string,
  M extends SubqlSolanaMapping = SubqlSolanaMapping<SubqlSolanaCustomHandler>,
  O = any
> extends ISubqlSolanaDatasource<M> {
  kind: K;
  assets: Map<string, CustomDataSourceAsset>;
  processor: Processor<O>;
}

//export type SubqlSolanaBuiltinDataSource = ISubqlSolanaDatasource;

export interface HandlerInputTransformer<
  T extends SubqlSolanaHandlerKind,
  U,
  DS extends SubqlSolanaCustomDatasource = SubqlSolanaCustomDatasource
> {
  (original: RuntimeHandlerInputMap[T], ds: DS, api: Connection, assets: Record<string, string>): Promise<U>; //  | SubqlSolanaBuiltinDataSource
}

export interface SubqlSolanaDatasourceProcessor<
  K extends string,
  DS extends SubqlSolanaCustomDatasource<K> = SubqlSolanaCustomDatasource<K>
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: Connection): boolean;
  handlerProcessors: {[kind: string]: SecondLayerHandlerProcessor<SubqlSolanaHandlerKind, unknown, unknown, DS>};
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
  K extends SubqlSolanaHandlerKind,
  F,
  E,
  DS extends SubqlSolanaCustomDatasource = SubqlSolanaCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: RuntimeFilterMap[K] | RuntimeFilterMap[K][];
  transformer: HandlerInputTransformer<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: RuntimeHandlerInputMap[K], ds: DS) => boolean;
  filterValidator: (filter: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry;
}
