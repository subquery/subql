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
}

export interface SubqlCosmosTransactionHandler {
  handler: string;
  kind: SubqlCosmosHandlerKind.Transaction;
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

export interface CosmosHandlerInputTransformer<
  T extends SubqlCosmosHandlerKind,
  U,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource
> {
  (original: CosmosRuntimeHandlerInputMap[T], ds: DS, api: CosmWasmClient, assets: Record<string, string>): Promise<U>; //  | SubqlBuiltinDataSource
}

export interface SubqlCosmosDatasourceProcessor<
  K extends string,
  DS extends SubqlCosmosCustomDatasource<K> = SubqlCosmosCustomDatasource<K>
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: CosmWasmClient): boolean;
  handlerProcessors: {
    [kind: string]: SecondLayerCosmosHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown, DS>;
  };
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

export interface SecondLayerCosmosHandlerProcessor<
  K extends SubqlCosmosHandlerKind,
  F,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: CosmosRuntimeFilterMap[K] | CosmosRuntimeFilterMap[K][];
  transformer: CosmosHandlerInputTransformer<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: CosmosRuntimeHandlerInputMap[K], ds: DS) => boolean;
  filterValidator: (filter: F) => void;
  dictionaryQuery: (filter: F, ds: DS) => DictionaryQueryEntry;
}
