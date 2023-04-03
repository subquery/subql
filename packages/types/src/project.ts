// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegistryTypes} from '@polkadot/types/types';
import {
  EthereumBlock,
  EthereumBlockFilter,
  EthereumLog,
  EthereumLogFilter,
  EthereumTransaction,
  EthereumTransactionFilter,
} from './ethereum';
import {ApiWrapper} from './interfaces';

export enum EthereumDatasourceKind {
  Runtime = 'ethereum/Runtime',
}

export enum EthereumHandlerKind {
  Block = 'ethereum/BlockHandler',
  Call = 'ethereum/TransactionHandler',
  Event = 'ethereum/LogHandler',
}

export type EthereumRuntimeHandlerInputMap = {
  [EthereumHandlerKind.Block]: EthereumBlock;
  [EthereumHandlerKind.Call]: EthereumTransaction;
  [EthereumHandlerKind.Event]: EthereumLog;
};

type EthereumRuntimeFilterMap = {
  [EthereumHandlerKind.Block]: EthereumBlockFilter;
  [EthereumHandlerKind.Event]: EthereumLogFilter;
  [EthereumHandlerKind.Call]: EthereumTransactionFilter;
};

export interface ProjectManifest {
  specVersion: string;
  description: string;
  repository: string;

  schema: string;

  network: {
    endpoint: string | string[];
    customTypes?: RegistryTypes;
  };

  dataSources: SubqlDatasource[];
  bypassBlocks?: number[];
}

export interface SubqlBlockHandler {
  handler: string;
  kind: EthereumHandlerKind.Block;
  filter?: EthereumBlockFilter;
}

export interface SubqlCallHandler {
  handler: string;
  kind: EthereumHandlerKind.Call;
  filter?: EthereumTransactionFilter;
}

export interface SubqlEventHandler {
  handler: string;
  kind: EthereumHandlerKind.Event;
  filter?: EthereumLogFilter;
}

export interface SubqlCustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export type SubqlRuntimeHandler = SubqlBlockHandler | SubqlCallHandler | SubqlEventHandler;

export type SubqlHandler = SubqlRuntimeHandler | SubqlCustomHandler<string, unknown>;

export type SubqlHandlerFilter = EthereumBlockFilter | EthereumTransactionFilter | EthereumLogFilter;

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

export interface SubqlEthereumProcessorOptions {
  abi?: string;
  address?: string;
}

export interface SubqlRuntimeDatasource<M extends SubqlMapping<SubqlRuntimeHandler> = SubqlMapping<SubqlRuntimeHandler>>
  extends ISubqlDatasource<M> {
  kind: EthereumDatasourceKind.Runtime;
  options?: SubqlEthereumProcessorOptions;
  assets?: Map<string, {file: string}>;
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
  M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>,
  O = any
> extends ISubqlDatasource<M> {
  kind: K;
  assets: Map<string, CustomDataSourceAsset>;
  options?: SubqlEthereumProcessorOptions;
  processor: Processor<O>;
}

//export type SubqlBuiltinDataSource = ISubqlDatasource;

export interface HandlerInputTransformer_0_0_0<
  T extends EthereumHandlerKind,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> {
  (input: EthereumRuntimeHandlerInputMap[T], ds: DS, api: ApiWrapper, assets?: Record<string, string>): Promise<E>; //  | SubstrateBuiltinDataSource
}

export interface HandlerInputTransformer_1_0_0<
  T extends EthereumHandlerKind,
  F,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> {
  (params: {
    input: EthereumRuntimeHandlerInputMap[T];
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
> =
  | SecondLayerHandlerProcessor<EthereumHandlerKind.Block, F, T, DS>
  | SecondLayerHandlerProcessor<EthereumHandlerKind.Call, F, T, DS>
  | SecondLayerHandlerProcessor<EthereumHandlerKind.Event, F, T, DS>;

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

// export interface DictionaryQueryCondition {
//   field: string;
//   value: string;
//   matcher?: string; // defaults to "equalTo", use "contains" for JSON
// }

// export interface DictionaryQueryEntry {
//   entity: string;
//   conditions: DictionaryQueryCondition[];
// }

interface SecondLayerHandlerProcessorBase<
  K extends EthereumHandlerKind,
  F,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: EthereumRuntimeFilterMap[K] | EthereumRuntimeFilterMap[K][];
  filterValidator: (filter?: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry | undefined;
}

export interface SecondLayerHandlerProcessor_0_0_0<
  K extends EthereumHandlerKind,
  F,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: undefined;
  transformer: HandlerInputTransformer_0_0_0<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: EthereumRuntimeHandlerInputMap[K], ds: DS) => boolean;
}

export interface SecondLayerHandlerProcessor_1_0_0<
  K extends EthereumHandlerKind,
  F,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: '1.0.0';
  transformer: HandlerInputTransformer_1_0_0<K, F, E, DS>;
  filterProcessor: (params: {filter: F | undefined; input: EthereumRuntimeHandlerInputMap[K]; ds: DS}) => boolean;
}

export type SecondLayerHandlerProcessor<
  K extends EthereumHandlerKind,
  F,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> = SecondLayerHandlerProcessor_0_0_0<K, F, E, DS> | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>;
