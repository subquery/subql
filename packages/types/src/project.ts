// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ApiPromise} from '@polkadot/api';
import {AnyTuple} from '@polkadot/types/types';
import {
  BaseTemplateDataSource,
  CommonSubqueryNetworkConfig,
  CommonSubqueryProject,
  DictionaryQueryEntry,
  FileReference,
  Processor,
  ProjectManifestV1_0_0,
} from '@subql/types-core';
import {LightSubstrateEvent, SubstrateBlock, SubstrateEvent, SubstrateExtrinsic} from './interfaces';

export type RuntimeDatasourceTemplate = BaseTemplateDataSource<SubstrateDatasource>;
export type CustomDatasourceTemplate = BaseTemplateDataSource<SubstrateCustomDatasource>;

export type SubstrateProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  SubstrateRuntimeDatasource | SubstrateCustomDatasource
>;

/**
 * Kind of Substrate datasource.
 * @enum {string}
 */
export enum SubstrateDatasourceKind {
  /**
   * The runtime kind of Substrate datasource.
   */
  Runtime = 'substrate/Runtime',
}

/**
 * Enum representing the kind of Substrate handler.
 * @enum {string}
 */
export enum SubstrateHandlerKind {
  /**
   * Handler for Substrate blocks.
   */
  Block = 'substrate/BlockHandler',

  /**
   * Handler for Substrate calls.
   */
  Call = 'substrate/CallHandler',

  /**
   * Handler for Substrate events.
   */
  Event = 'substrate/EventHandler',
}

export type RuntimeHandlerInputMap<T extends AnyTuple = AnyTuple> = {
  [SubstrateHandlerKind.Block]: SubstrateBlock;
  [SubstrateHandlerKind.Event]: SubstrateEvent<T> | LightSubstrateEvent<T>;
  [SubstrateHandlerKind.Call]: SubstrateExtrinsic<T>;
};

type RuntimeFilterMap = {
  [SubstrateHandlerKind.Block]: SubstrateBlockFilter;
  [SubstrateHandlerKind.Event]: SubstrateEventFilter;
  [SubstrateHandlerKind.Call]: SubstrateCallFilter;
};

// [startSpecVersion?, endSpecVersion?] closed range
export type SpecVersionRange = [number, number];

interface SubstrateBaseHandlerFilter {
  specVersion?: SpecVersionRange;
}

/**
 * Represents a filter for Substrate blocks, extending SubstrateBaseHandlerFilter.
 * @interface
 * @extends {SubstrateBaseHandlerFilter}
 */
export interface SubstrateBlockFilter extends SubstrateBaseHandlerFilter {
  /**
   * The modulo value for filtering blocks (optional).
   * @type {number}
   * @example
   * modulo: 5, // every 5 blocks will be indexed
   */
  modulo?: number;

  /**
   * A cron expression will index blocks at an interval (optional).
   * @type {string}
   * @example
   * timestamp: "\*\/5 * * * *"
   */
  timestamp?: string;
}

/**
 * Represents a filter for Substrate events, extending SubstrateBaseHandlerFilter.
 * @interface
 * @extends {SubstrateBaseHandlerFilter}
 */
export interface SubstrateEventFilter extends SubstrateBaseHandlerFilter {
  /**
   * The module name for filtering events or calls (optional).
   * @type {string}
   * @example
   * module: balances
   */
  module?: string;

  /**
   * The method name for filtering events calls (optional).
   * @type {string}
   * @example
   * method: Transfer
   */
  method?: string;
}

/**
 * Represents a filter for Substrate calls, extending SubstrateEventFilter.
 * @interface
 * @extends {SubstrateEventFilter}
 */
export interface SubstrateCallFilter extends SubstrateEventFilter {
  /**
   * Indicates whether the call was successful (optional).
   * @type {boolean}
   */
  success?: boolean;

  /**
   * Indicates whether the call is signed (optional).
   * @type {boolean}
   */
  isSigned?: boolean;
}

/**
 * Represents a custom handler for Substrate blocks.
 * @type {SubstrateCustomHandler<SubstrateHandlerKind.Block, SubstrateBlockFilter>}
 */
export type SubstrateBlockHandler = SubstrateCustomHandler<SubstrateHandlerKind.Block, SubstrateBlockFilter>;

/**
 * Represents a custom handler for Substrate calls.
 * @type {SubstrateCustomHandler<SubstrateHandlerKind.Call, SubstrateCallFilter>}
 */
export type SubstrateCallHandler = SubstrateCustomHandler<SubstrateHandlerKind.Call, SubstrateCallFilter>;

/**
 * Represents a custom handler for Substrate events.
 * @type {SubstrateCustomHandler<SubstrateHandlerKind.Event, SubstrateEventFilter>}
 */
export type SubstrateEventHandler = SubstrateCustomHandler<SubstrateHandlerKind.Event, SubstrateEventFilter>;

/**
 * Represents a generic custom handler for Substrate.
 * @interface
 * @template K - The kind of the handler (default: string).
 * @template F - The filter type for the handler (default: Record<string, unknown>).
 */
export interface SubstrateCustomHandler<K extends string = string, F = Record<string, unknown>> {
  /**
   * The name of your handler function.
   * @type {string}
   * @example
   * handler: 'handleBlock'
   */
  handler: string;

  /**
   * The kind of the handler.
   * @type {K}
   */
  kind: K;

  /**
   * The filter for the handler (optional).
   * @type {F}
   */
  filter?: F;
}

/**
 * Represents a runtime handler for Substrate, which can be a block handler, call handler, or event handler.
 * @type {SubstrateBlockHandler | SubstrateCallHandler | SubstrateEventHandler}
 */
export type SubstrateRuntimeHandler = SubstrateBlockHandler | SubstrateCallHandler | SubstrateEventHandler;

/**
 * Represents a handler for Substrate, which can be a runtime handler or a custom handler with unknown filter type.
 * @type {SubstrateRuntimeHandler | SubstrateCustomHandler<string, unknown>}
 */
export type SubstrateHandler = SubstrateRuntimeHandler | SubstrateCustomHandler<string, unknown>;

/**
 * Represents a filter for Substrate runtime handlers, which can be a block filter, call filter, or event filter.
 * @type {SubstrateBlockFilter | SubstrateCallFilter | SubstrateEventFilter}
 */
export type SubstrateRuntimeHandlerFilter = SubstrateBlockFilter | SubstrateCallFilter | SubstrateEventFilter;

/**
 * Represents a mapping for Substrate handlers, extending FileReference.
 * @interface
 * @extends {FileReference}
 */
export interface SubstrateMapping<T extends SubstrateHandler = SubstrateHandler> extends FileReference {
  /**
   * An array of handlers associated with the mapping.
   * @type {T[]}
   */
  handlers: T[];
}

/**
 * Represents a Substrate datasource interface with generic parameters.
 * @interface
 * @template M - The mapping type for the datasource.
 * @template F - The filter type for the datasource (default: SubstrateNetworkFilter).
 */
interface ISubstrateDatasource<M extends SubstrateMapping> {
  /**
   * The kind of the datasource.
   * @type {string}
   */
  kind: string;

  /**
   * The starting block number for the datasource. If not specified, 1 will be used (optional).
   * @type {number}
   */
  startBlock?: number;

  /**
   * The mapping associated with the datasource.
   * @type {M}
   */
  mapping: M;
}

/**
 * Represents a runtime datasource for Substrate.
 * @interface
 * @template M - The mapping type for the datasource (default: SubstrateMapping<SubstrateRuntimeHandler>).
 */
export interface SubstrateRuntimeDatasource<
  M extends SubstrateMapping<SubstrateRuntimeHandler> = SubstrateMapping<SubstrateRuntimeHandler>
> extends ISubstrateDatasource<M> {
  /**
   * The kind of the datasource, which is substrate/Runtime.
   * @type {SubstrateDatasourceKind.Runtime}
   */
  kind: SubstrateDatasourceKind.Runtime;
}

/**
 * Represents a Substrate datasource, which can be either runtime or custom.
 * @type {SubstrateDatasource}
 */
export type SubstrateDatasource = SubstrateRuntimeDatasource | SubstrateCustomDatasource;

/**
 * Represents a custom datasource for Substrate.
 * @interface
 * @template K - The kind of the datasource (default: string).
 * @template T - The filter type for the datasource (default: SubstrateNetworkFilter).
 * @template M - The mapping type for the datasource (default: SubstrateMapping<SubstrateCustomHandler>).
 * @template O - The processor options (default: any).
 */
export interface SubstrateCustomDatasource<
  K extends string = string,
  M extends SubstrateMapping = SubstrateMapping<SubstrateCustomHandler>,
  O = any
> extends ISubstrateDatasource<M> {
  /**
   * The kind of the custom datasource.
   * @type {K}
   */
  kind: K; //`substrate/${string}`;

  /**
   * A map of custom datasource assets.
   * @type {Map<string, CustomDataSourceAsset>}
   */
  assets: Map<string, CustomDataSourceAsset>;

  /**
   * The processor used for the custom datasource.
   * @type {Processor<O>}
   */
  processor: Processor<O>;
}

export interface HandlerInputTransformer_0_0_0<
  T extends SubstrateHandlerKind,
  E,
  IT extends AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> {
  (input: RuntimeHandlerInputMap<IT>[T], ds: DS, api: ApiPromise, assets?: Record<string, string>): Promise<E>; //  | SubstrateBuiltinDataSource
}

export interface HandlerInputTransformer_1_0_0<
  T extends SubstrateHandlerKind,
  F extends Record<string, unknown>,
  E,
  IT extends AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> {
  (params: {
    input: RuntimeHandlerInputMap<IT>[T];
    ds: DS;
    filter?: F;
    api: ApiPromise;
    assets?: Record<string, string>;
  }): Promise<E[]>; //  | SubstrateBuiltinDataSource
}

type SecondLayerHandlerProcessorArray<
  K extends string,
  F extends Record<string, unknown>,
  T,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource<K> = SubstrateCustomDatasource<K>
> =
  | SecondLayerHandlerProcessor<SubstrateHandlerKind.Block, F, T, IT, DS>
  | SecondLayerHandlerProcessor<SubstrateHandlerKind.Call, F, T, IT, DS>
  | SecondLayerHandlerProcessor<SubstrateHandlerKind.Event, F, T, IT, DS>;

export interface SubstrateDatasourceProcessor<
  K extends string,
  F extends Record<string, unknown>,
  DS extends SubstrateCustomDatasource<K> = SubstrateCustomDatasource<K>,
  P extends Record<string, SecondLayerHandlerProcessorArray<K, F, any, any, DS>> = Record<
    string,
    SecondLayerHandlerProcessorArray<K, F, any, any, DS>
  >
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: ApiPromise): boolean;
  handlerProcessors: P;
}

interface SecondLayerHandlerProcessorBase<
  K extends SubstrateHandlerKind,
  F extends Record<string, unknown>,
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
  F extends Record<string, unknown>,
  E,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: undefined;
  transformer: HandlerInputTransformer_0_0_0<K, E, IT, DS>;
  filterProcessor: (filter: F | undefined, input: RuntimeHandlerInputMap<IT>[K], ds: DS) => boolean;
}

export interface SecondLayerHandlerProcessor_1_0_0<
  K extends SubstrateHandlerKind,
  F extends Record<string, unknown>,
  E,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: '1.0.0';
  transformer: HandlerInputTransformer_1_0_0<K, F, E, IT, DS>;
  filterProcessor: (params: {filter: F | undefined; input: RuntimeHandlerInputMap<IT>[K]; ds: DS}) => boolean;
}

export type SecondLayerHandlerProcessor<
  K extends SubstrateHandlerKind,
  F extends Record<string, unknown>,
  E,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> = SecondLayerHandlerProcessor_0_0_0<K, F, E, IT, DS> | SecondLayerHandlerProcessor_1_0_0<K, F, E, IT, DS>;

/**
 * Represents a Substrate subquery network configuration, which is based on the CommonSubqueryNetworkConfig template.
 * @type {CommonSubqueryNetworkConfig}
 */
export type SubstrateSubqueryNetworkConfig = CommonSubqueryNetworkConfig;

/**
 * Represents a Substrate project configuration based on the CommonSubqueryProject template.
 * @type {CommonSubqueryProject<SubstrateSubqueryNetworkConfig, SubstrateDatasource, RuntimeDatasourceTemplate | CustomDatasourceTemplate>}
 */
export type SubstrateProject<DS extends SubstrateDatasource = SubstrateRuntimeDatasource> = CommonSubqueryProject<
  SubstrateSubqueryNetworkConfig,
  SubstrateRuntimeDatasource | DS,
  BaseTemplateDataSource<SubstrateRuntimeDatasource> | BaseTemplateDataSource<DS>
>;

export type CustomDataSourceAsset = FileReference;
