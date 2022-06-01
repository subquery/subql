// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {CosmWasmClient} from '@cosmjs/cosmwasm-stargate';
import {StargateClient} from '@cosmjs/stargate';
import {CosmosBlock, CosmosTransaction, CosmosMessage, CosmosEvent} from './interfaces';

export interface FileReference {
  file: string;
}

export interface CustomModule {
  file: string;
  messages: string[];
}

export type CustomDataSourceAsset = FileReference;

export type Processor<O = any> = FileReference & {options?: O};

export enum SubqlCosmosDatasourceKind {
  Runtime = 'cosmos/Runtime',
  Custom = 'cosmos/Custom',
}

export enum SubqlCosmosHandlerKind {
  Block = 'cosmos/BlockHandler',
  Transaction = 'cosmos/TransactionHandler',
  Message = 'cosmos/MessageHandler',
  Event = 'cosmos/EventHandler',
}

export type CosmosRuntimeHandlerInputMap = {
  [SubqlCosmosHandlerKind.Block]: CosmosBlock;
  [SubqlCosmosHandlerKind.Transaction]: CosmosTransaction;
  [SubqlCosmosHandlerKind.Message]: CosmosMessage;
  [SubqlCosmosHandlerKind.Event]: CosmosEvent;
};

type CosmosRuntimeFilterMap = {
  [SubqlCosmosHandlerKind.Block]: {};
  [SubqlCosmosHandlerKind.Transaction]: {};
  [SubqlCosmosHandlerKind.Message]: SubqlCosmosMessageFilter;
  [SubqlCosmosHandlerKind.Event]: SubqlCosmosEventFilter;
};

export interface CosmosProjectManifest {
  specVersion: string;
  description: string;
  repository: string;

  schema: {
    file: string;
  };

  network: CosmosNetwork;

  dataSources: SubqlCosmosDatasource[];
}

export interface CosmosNetwork {
  genesisHash: string;
  endpoint: string;
  chainId: string;
}

export interface SubqlCosmosMessageFilter {
  type: string;
  contractCall?: string;
  values?: {
    [key: string]: string;
  };
}

export interface SubqlCosmosEventFilter {
  type: string;
  messageFilter?: SubqlCosmosMessageFilter;
}

export type SubqlCosmosHandlerFilter = SubqlCosmosEventFilter | SubqlCosmosMessageFilter;

export interface SubqlCosmosBlockHandler {
  handler: string;
  kind: SubqlCosmosHandlerKind.Block;
  filter?: undefined;
}

export interface SubqlCosmosTransactionHandler {
  handler: string;
  kind: SubqlCosmosHandlerKind.Transaction;
  filter?: undefined;
}

export interface SubqlCosmosMessageHandler {
  handler: string;
  kind: SubqlCosmosHandlerKind.Message;
  filter?: SubqlCosmosMessageFilter;
}

export interface SubqlCosmosEventHandler {
  handler: string;
  kind: SubqlCosmosHandlerKind.Event;
  filter?: SubqlCosmosEventFilter;
}

export interface SubqlCosmosCustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export type SubqlCosmosRuntimeHandler =
  | SubqlCosmosBlockHandler
  | SubqlCosmosTransactionHandler
  | SubqlCosmosMessageHandler
  | SubqlCosmosEventHandler;

export type SubqlCosmosHandler = SubqlCosmosRuntimeHandler | SubqlCosmosCustomHandler;

export interface SubqlCosmosMapping<T extends SubqlCosmosHandler = SubqlCosmosHandler> {
  file: string;
  handlers: T[];
}

interface ISubqlCosmosDatasource<M extends SubqlCosmosMapping> {
  name?: string;
  kind: string;
  startBlock?: number;
  mapping: M;
}

export interface SubqlCosmosRuntimeDatasource<
  M extends SubqlCosmosMapping<SubqlCosmosRuntimeHandler> = SubqlCosmosMapping<SubqlCosmosRuntimeHandler>
> extends ISubqlCosmosDatasource<M> {
  kind: SubqlCosmosDatasourceKind.Runtime;
  chainTypes: Map<string, CustomModule>;
}

export type SubqlCosmosDatasource = SubqlCosmosRuntimeDatasource | SubqlCosmosCustomDatasource;

export type CustomCosmosDataSourceAsset = FileReference;

export interface SubqlCosmosCustomDatasource<
  K extends string = string,
  M extends SubqlCosmosMapping = SubqlCosmosMapping<SubqlCosmosCustomHandler>,
  O = any
> extends ISubqlCosmosDatasource<M> {
  kind: K;
  assets: Map<string, CustomCosmosDataSourceAsset>;
  chainTypes: Map<string, CustomModule>;
  processor?: Processor<O>;
}

export interface HandlerInputTransformer_0_0_0<
  T extends SubqlCosmosHandlerKind,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource
> {
  (input: CosmosRuntimeHandlerInputMap[T], ds: DS, api: CosmWasmClient, assets?: Record<string, string>): Promise<E>; //  | SubstrateBuiltinDataSource
}

export interface HandlerInputTransformer_1_0_0<
  T extends SubqlCosmosHandlerKind,
  F,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource
> {
  (params: {
    input: CosmosRuntimeHandlerInputMap[T];
    ds: DS;
    filter?: F;
    api: CosmWasmClient;
    assets?: Record<string, string>;
  }): Promise<E[]>; //  | SubstrateBuiltinDataSource
}

export type SecondLayerHandlerProcessorArray<
  K extends string,
  F,
  T,
  DS extends SubqlCosmosCustomDatasource<K> = SubqlCosmosCustomDatasource<K>
> =
  | SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Block, F, T, DS>
  | SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Transaction, F, T, DS>
  | SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Message, F, T, DS>
  | SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Event, F, T, DS>;

export interface SubqlCosmosDatasourceProcessor<
  K extends string,
  F,
  DS extends SubqlCosmosCustomDatasource<K> = SubqlCosmosCustomDatasource<K>,
  P extends Record<string, SecondLayerHandlerProcessorArray<K, F, any, DS>> = Record<
    string,
    SecondLayerHandlerProcessorArray<K, F, any, DS>
  >
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: CosmWasmClient): boolean;
  handlerProcessors: P;
}

export interface DictionaryQueryCondition {
  field: string;
  value: string | Record<string, string> | Array<Record<string, string>>;
  matcher?: string; // defaults to "equalTo", use "contains" for JSON
}

export interface DictionaryQueryEntry {
  entity: string;
  conditions: DictionaryQueryCondition[];
}

interface SecondLayerHandlerProcessorBase<
  K extends SubqlCosmosHandlerKind,
  F,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: CosmosRuntimeFilterMap[K] | CosmosRuntimeFilterMap[K][];
  filterValidator: (filter?: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry | undefined;
}

export interface SecondLayerHandlerProcessor_0_0_0<
  K extends SubqlCosmosHandlerKind,
  F,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: undefined;
  transformer: HandlerInputTransformer_0_0_0<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: CosmosRuntimeHandlerInputMap[K], ds: DS) => boolean;
}

export interface SecondLayerHandlerProcessor_1_0_0<
  K extends SubqlCosmosHandlerKind,
  F,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: '1.0.0';
  transformer: HandlerInputTransformer_1_0_0<K, F, E, DS>;
  filterProcessor: (params: {filter: F | undefined; input: CosmosRuntimeHandlerInputMap[K]; ds: DS}) => boolean;
}

export type SecondLayerHandlerProcessor<
  K extends SubqlCosmosHandlerKind,
  F,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource
> = SecondLayerHandlerProcessor_0_0_0<K, F, E, DS> | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>;
