// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {LCDClient} from '@terra-money/terra.js';
import {TerraBlock, TerraEvent} from './interfaces';
import {TerraCall} from '.';

export interface FileReference {
  file: string;
}

export type CustomDataSourceAsset = FileReference;

export type Processor<O = any> = FileReference & {options?: O};

export enum SubqlTerraDatasourceKind {
  Runtime = 'terra/Runtime',
  Custom = 'terra/Custom',
}

export enum SubqlTerraHandlerKind {
  Block = 'terra/BlockHandler',
  Event = 'terra/EventHandler',
  Call = 'terra/CallHandler',
}

export type TerraRuntimeHandlerInputMap = {
  [SubqlTerraHandlerKind.Block]: TerraBlock;
  [SubqlTerraHandlerKind.Event]: TerraEvent;
  [SubqlTerraHandlerKind.Call]: TerraCall;
};

type TerraRuntimeFilterMap = {
  [SubqlTerraHandlerKind.Block]: {};
  [SubqlTerraHandlerKind.Event]: SubqlTerraEventFilter;
  [SubqlTerraHandlerKind.Call]: SubqlTerraCallFilter;
};

export interface TerraProjectManifest {
  specVersion: string;
  description: string;
  repository: string;

  schema: {
    file: string;
  };

  network: TerraNetwork;

  dataSources: SubqlTerraDatasource[];
}

export interface TerraNetwork {
  genesisHash: string;
  endpoint: string;
  chainId: string;
}

export interface SubqlTerraEventFilter {
  contract?: string;
  type?: string;
}

export interface SubqlTerraCallFilter {
  contract?: string;
  from?: string;
  function?: string;
}

export type SubqlTerraHandlerFilter = SubqlTerraEventFilter;

export interface SubqlTerraBlockHandler {
  handler: string;
  kind: SubqlTerraHandlerKind.Block;
}

export interface SubqlTerraEventHandler {
  handler: string;
  kind: SubqlTerraHandlerKind.Event;
  filter?: SubqlTerraEventFilter;
}

export interface SubqlTerraCallHandler {
  handler: string;
  kind: SubqlTerraHandlerKind.Call;
  filter?: SubqlTerraCallFilter;
}

export interface SubqlTerraCustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export type SubqlTerraRuntimeHandler = SubqlTerraBlockHandler | SubqlTerraEventHandler | SubqlTerraCallHandler;

export type SubqlTerraHandler = SubqlTerraRuntimeHandler | SubqlTerraCustomHandler;

export interface SubqlTerraMapping<T extends SubqlTerraHandler = SubqlTerraHandler> {
  file: string;
  handlers: T[];
}

interface ISubqlTerraDatasource<M extends SubqlTerraMapping> {
  name?: string;
  kind: string;
  startBlock?: number;
  mapping: M;
}

export interface SubqlTerraRuntimeDatasource<
  M extends SubqlTerraMapping<SubqlTerraRuntimeHandler> = SubqlTerraMapping<SubqlTerraRuntimeHandler>
> extends ISubqlTerraDatasource<M> {
  kind: SubqlTerraDatasourceKind.Runtime;
}

export type SubqlTerraDatasource = SubqlTerraRuntimeDatasource | SubqlTerraCustomDatasource;

export type CustomTerraDataSourceAsset = FileReference;

export interface SubqlTerraCustomDatasource<
  K extends string = string,
  M extends SubqlTerraMapping = SubqlTerraMapping<SubqlTerraCustomHandler>,
  O = any
> extends ISubqlTerraDatasource<M> {
  kind: K;
  assets: Map<string, CustomTerraDataSourceAsset>;
  processor: Processor<O>;
}

export interface TerraHandlerInputTransformer<
  T extends SubqlTerraHandlerKind,
  U,
  DS extends SubqlTerraCustomDatasource = SubqlTerraCustomDatasource
> {
  (original: TerraRuntimeHandlerInputMap[T], ds: DS, api: LCDClient, assets: Record<string, string>): Promise<U>; //  | SubqlBuiltinDataSource
}

export interface SubqlTerraDatasourceProcessor<
  K extends string,
  DS extends SubqlTerraCustomDatasource<K> = SubqlTerraCustomDatasource<K>
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: LCDClient): boolean;
  handlerProcessors: {
    [kind: string]: SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind, unknown, unknown, DS>;
  };
}

export interface DictionaryQueryCondition {
  field: string;
  value: string;
}

export interface DictionaryQueryEntry {
  entity: string;
  conditions: DictionaryQueryCondition[];
}

export interface SecondLayerTerraHandlerProcessor<
  K extends SubqlTerraHandlerKind,
  F,
  E,
  DS extends SubqlTerraCustomDatasource = SubqlTerraCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: TerraRuntimeFilterMap[K] | TerraRuntimeFilterMap[K][];
  transformer: TerraHandlerInputTransformer<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: TerraRuntimeHandlerInputMap[K], ds: DS) => boolean;
  filterValidator: (filter: F) => void;
  dictionaryQuery: (filter: F, ds: DS) => DictionaryQueryEntry;
}
