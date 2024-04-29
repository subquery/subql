// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BaseTemplateDataSource,
  IProjectNetworkConfig,
  CommonSubqueryProject,
  FileReference,
  Processor,
  ProjectManifestV1_0_0,
  BaseHandler,
  BaseMapping,
  BaseDataSource,
  SecondLayerHandlerProcessor_0_0_0,
  SecondLayerHandlerProcessor_1_0_0,
  DsProcessor,
} from '@subql/types-core';
import {ApiWrapper} from './interfaces';
import {
  StellarBlock,
  StellarBlockFilter,
  StellarEffect,
  StellarEffectFilter,
  SorobanEvent,
  SorobanEventFilter,
  StellarOperation,
  StellarOperationFilter,
  StellarTransaction,
  StellarTransactionFilter,
} from './stellar';

export type RuntimeDatasourceTemplate = BaseTemplateDataSource<SubqlRuntimeDatasource>;
export type CustomDatasourceTemplate = BaseTemplateDataSource<SubqlCustomDatasource>;

export type StellarProjectManifestV1_0_0 = ProjectManifestV1_0_0<SubqlRuntimeDatasource | SubqlCustomDatasource>;

/**
 * Kind of Stellar datasource.
 * @enum {string}
 */
export enum StellarDatasourceKind {
  /**
   * The runtime kind of Stellar datasource.
   */
  Runtime = 'stellar/Runtime',
}

/**
 * Enum representing the kind of Stellar handler.
 * @enum {string}
 */
export enum StellarHandlerKind {
  /**
   * Handler for Stellar blocks.
   */
  Block = 'stellar/BlockHandler',
  /**
   * Handler for Stellar Transactions.
   */
  Transaction = 'stellar/TransactionHandler',
  /**
   * Handler for Soroban Transactions.
   */
  SorobanTransaction = 'soroban/TransactionHandler',
  /**
   * Handler for Stellar Operations.
   */
  Operation = 'stellar/OperationHandler',
  /**
   * Handler for Stellar Effects.
   */
  Effects = 'stellar/EffectHandler',
  /**
   * Handler for Soroban Events.
   */
  Event = 'soroban/EventHandler',
}

export type StellarRuntimeHandlerInputMap = {
  [StellarHandlerKind.Block]: StellarBlock;
  [StellarHandlerKind.Transaction]: StellarTransaction;
  [StellarHandlerKind.SorobanTransaction]: StellarTransaction;
  [StellarHandlerKind.Operation]: StellarOperation;
  [StellarHandlerKind.Effects]: StellarEffect;
  [StellarHandlerKind.Event]: SorobanEvent;
};

/**
 * Represents a handler for Stellar blocks.
 * @type {SubqlCustomHandler<StellarHandlerKind.Block, StellarBlockFilter>}
 */
export interface SubqlBlockHandler {
  handler: string;
  kind: StellarHandlerKind.Block;
  filter?: StellarBlockFilter;
}

/**
 * Represents a handler for Stellar transactions.
 * @type {SubqlCustomHandler<StellarHandlerKind.Transaction, StellarTransactionFilter>}
 */
export interface SubqlTransactionHandler {
  handler: string;
  kind: StellarHandlerKind.Transaction;
  filter?: StellarTransactionFilter;
}

/**
 * Represents a handler for Soroban transactions.
 * @type {SubqlCustomHandler<StellarHandlerKind.SorobanTransaction, StellarTransactionFilter>}
 */
export interface SubqlSorobanTransactionHandler {
  handler: string;
  kind: StellarHandlerKind.SorobanTransaction;
  filter?: StellarTransactionFilter;
}

/**
 * Represents a handler for Stellar operations.
 * @type {SubqlCustomHandler<StellarHandlerKind.Operation, StellarOperationFilter>}
 */
export interface SubqlOperationHandler {
  handler: string;
  kind: StellarHandlerKind.Operation;
  filter?: StellarOperationFilter;
}

/**
 * Represents a handler for Stellar effects.
 * @type {SubqlCustomHandler<StellarHandlerKind.Effects, StellarEffectFilter>}
 */
export interface SubqlEffectHandler {
  handler: string;
  kind: StellarHandlerKind.Effects;
  filter?: StellarEffectFilter;
}

/**
 * Represents a handler for Soroban event.
 * @type {SubqlCustomHandler<StellarHandlerKind.Event, SorobanEventFilter>}
 */
export interface SubqlEventHandler {
  handler: string;
  kind: StellarHandlerKind.Event;
  filter?: SorobanEventFilter;
}

/**
 * Represents a generic custom handler for Stellar.
 * @interface
 * @template K - The kind of the handler (default: string).
 * @template F - The filter type for the handler (default: Record<string, unknown>).
 */

export interface SubqlCustomHandler<K extends string = string, F = Record<string, unknown>> extends BaseHandler<F, K> {
  /**
   * The kind of handler. For `stellar/Runtime` datasources this is either `Block`, `Transaction`, `Operation`, `Effect`  or `Event` kinds.
   * The value of this will determine the filter options as well as the data provided to your handler function
   * @type {StellarHandlerKind.Block | StellarHandlerKind.Transaction | StellarHandlerKind.SorobanTransaction | StellarHandlerKind.Operation | StellarHandlerKind.Effects | SubstrateHandlerKind.Event | string }
   * @example
   * kind: StellarHandlerFind.Block // Defined with an enum, this is used for runtime datasources
   */
  kind: K;
  /**
   * @type {F}
   * @example
   * filter: {
   *   account: 'account'
   * } // A Transaction filter
   */
  filter?: F;
}

/**
 * Represents a runtime handler for Stellar, which can be a block handler, transaction handler, operation handler, effect handler or event handler.
 * @type {SubqlBlockHandler | SubqlTransactionHandler | SubqlSorobanTransactionHandler | SubqlOperationHandler | SubqlEffectHandler | SubqlEventHandler}
 */
export type SubqlRuntimeHandler =
  | SubqlBlockHandler
  | SubqlTransactionHandler
  | SubqlSorobanTransactionHandler
  | SubqlOperationHandler
  | SubqlEffectHandler
  | SubqlEventHandler;

/**
 * Represents a handler for Stellar, which can be a runtime handler or a custom handler with unknown filter type.
 * @type {SubqlRuntimeHandler | SubqlCustomHandler<string, unknown>}
 */
export type SubqlHandler = SubqlRuntimeHandler | SubqlCustomHandler<string, unknown>;

/**
 * Represents a filter for Stellar runtime handlers, which can be a block filter, transaction filter, operation filter, effects filter or event filter.
 * @type {SubstrateBlockFilter | SubstrateCallFilter | SubstrateEventFilter}
 */
export type SubqlHandlerFilter =
  | SorobanEventFilter
  | StellarTransactionFilter
  | StellarOperationFilter
  | StellarEffectFilter
  | StellarBlockFilter;

/**
 * Represents a mapping for Stellar handlers, extending FileReference.
 * @interface
 * @extends {FileReference}
 */
export interface SubqlMapping<T extends SubqlHandler = SubqlHandler> extends BaseMapping<T> {
  /**
   * @type {T[]}
   * @example
   * handlers: [{
        kind: StellarHandlerKind.Transaction,
        handler: 'handleTx',
        filter: {
          account: ''
        }
      }]
   */
  handlers: T[];
}

/**
 * Represents a Stellar datasource interface with generic parameters.
 * @interface
 * @template M - The mapping type for the datasource.
 */
type ISubqlDatasource<M extends SubqlMapping> = BaseDataSource<SubqlHandler, M>;

export interface SubqlStellarProcessorOptions {
  /**
   * The specific contract that this datasource should filter.
   * Alternatively this can be left blank and a transaction to filter can be used instead
   * @example
   * address: '',
   * */
  address?: string;
}

/**
 * Represents a runtime datasource for Stellar.
 * @interface
 * @template M - The mapping type for the datasource (default: SubqlMapping<StellarRuntimeHandler>).
 */
export interface SubqlRuntimeDatasource<M extends SubqlMapping<SubqlRuntimeHandler> = SubqlMapping<SubqlRuntimeHandler>>
  extends ISubqlDatasource<M> {
  /**
   * The kind of the datasource, which is `stellar/Runtime`.
   * @type {StellarDatasourceKind.Runtime}
   */
  kind: StellarDatasourceKind.Runtime;
  /**
   * Options to specify details about the contract.
   * @example
   * options: {
   *   address: '',
   * }
   * */
  options?: SubqlStellarProcessorOptions;
}

export type SubqlDatasource = SubqlRuntimeDatasource | SubqlCustomDatasource;

export type CustomDataSourceAsset = FileReference;

export interface SubqlCustomDatasource<
  K extends string = string,
  M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>,
  O = any
> extends ISubqlDatasource<M> {
  kind: K;
  assets: Map<string, CustomDataSourceAsset>;
  options?: SubqlStellarProcessorOptions;
  processor: Processor<O>;
}

export type SecondLayerHandlerProcessor<
  K extends StellarHandlerKind,
  F extends Record<string, unknown>,
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> =
  | SecondLayerHandlerProcessor_0_0_0<StellarRuntimeHandlerInputMap, K, F, E, DS, ApiWrapper>
  | SecondLayerHandlerProcessor_1_0_0<StellarRuntimeHandlerInputMap, K, F, E, DS, ApiWrapper>;

export type SecondLayerHandlerProcessorArray<
  K extends string,
  F extends Record<string, unknown>,
  T,
  DS extends SubqlCustomDatasource<K> = SubqlCustomDatasource<K>
> =
  | SecondLayerHandlerProcessor<StellarHandlerKind.Block, F, T, DS>
  | SecondLayerHandlerProcessor<StellarHandlerKind.Transaction, F, T, DS>
  | SecondLayerHandlerProcessor<StellarHandlerKind.SorobanTransaction, F, T, DS>
  | SecondLayerHandlerProcessor<StellarHandlerKind.Operation, F, T, DS>
  | SecondLayerHandlerProcessor<StellarHandlerKind.Effects, F, T, DS>;

export type SubqlDatasourceProcessor<
  K extends string,
  F extends Record<string, unknown>,
  DS extends SubqlCustomDatasource<K> = SubqlCustomDatasource<K>,
  P extends Record<string, SecondLayerHandlerProcessorArray<K, F, any, DS>> = Record<
    string,
    SecondLayerHandlerProcessorArray<K, F, any, DS>
  >
> = DsProcessor<DS, P, ApiWrapper>;

/**
 * Represents a Stellar subquery network configuration, which is based on the CommonSubqueryNetworkConfig template.
 * @type {IProjectNetworkConfig}
 */
export type StellarNetworkConfig = IProjectNetworkConfig & {
  sorobanEndpoint?: string;
};

/**
 * Represents a Stellar project configuration based on the CommonSubqueryProject template.
 * @type {CommonSubqueryProject<EthereumNetworkConfig, SubqlDatasource, RuntimeDatasourceTemplate | CustomDatasourceTemplate>}
 */
export type StellarProject<DS extends SubqlDatasource = SubqlRuntimeDatasource> = CommonSubqueryProject<
  StellarNetworkConfig,
  SubqlRuntimeDatasource | DS,
  BaseTemplateDataSource<SubqlRuntimeDatasource> | BaseTemplateDataSource<DS>
>;
