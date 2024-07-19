// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BaseTemplateDataSource,
  IProjectNetworkConfig,
  CommonSubqueryProject,
  FileReference,
  Processor,
  ProjectManifestV1_0_0,
  BaseDataSource,
  SecondLayerHandlerProcessor_0_0_0,
  SecondLayerHandlerProcessor_1_0_0,
  DsProcessor,
  BaseCustomDataSource,
} from '@subql/types-core';
import {
  EthereumBlock,
  EthereumBlockFilter,
  EthereumLog,
  EthereumLogFilter,
  EthereumTransaction,
  EthereumTransactionFilter,
  LightEthereumLog,
} from './ethereum';
import {ApiWrapper} from './interfaces';

export type RuntimeDatasourceTemplate = BaseTemplateDataSource<SubqlRuntimeDatasource>;
export type CustomDatasourceTemplate = BaseTemplateDataSource<SubqlCustomDatasource>;

export type EthereumProjectManifestV1_0_0 = ProjectManifestV1_0_0<SubqlRuntimeDatasource | SubqlCustomDatasource>;

/**
 * Kind of Ethereum datasource.
 * @enum {string}
 */
export enum EthereumDatasourceKind {
  /**
   * The runtime kind of Ethereum datasource.
   */
  Runtime = 'ethereum/Runtime',
}

/**
 * Enum representing the kind of Ethereum handler.
 * @enum {string}
 */
export enum EthereumHandlerKind {
  /**
   * Handler for Ethereum blocks.
   */
  Block = 'ethereum/BlockHandler',
  /**
   * Handler for Ethereum transactions.
   */
  Call = 'ethereum/TransactionHandler',
  /**
   * Handler for Ethereum log events.
   */
  Event = 'ethereum/LogHandler',
}

export type EthereumRuntimeHandlerInputMap = {
  [EthereumHandlerKind.Block]: EthereumBlock;
  [EthereumHandlerKind.Call]: EthereumTransaction;
  [EthereumHandlerKind.Event]: EthereumLog | LightEthereumLog;
};

type EthereumRuntimeFilterMap = {
  [EthereumHandlerKind.Block]: EthereumBlockFilter;
  [EthereumHandlerKind.Event]: EthereumLogFilter;
  [EthereumHandlerKind.Call]: EthereumTransactionFilter;
};

/**
 * Represents a handler for Ethereum blocks.
 * @type {SubqlCustomHandler<EthereumHandlerKind.Block, EthereumBlockFilter>}
 */
export type SubqlBlockHandler = SubqlCustomHandler<EthereumHandlerKind.Block, EthereumBlockFilter>;
/**
 * Represents a handler for Ethereum transactions.
 * @type {SubqlCustomHandler<EthereumHandlerKind.Call, EthereumTransactionFilter>}
 */
export type SubqlCallHandler = SubqlCustomHandler<EthereumHandlerKind.Call, EthereumTransactionFilter>;
/**
 * Represents a handler for Ethereum logs.
 * @type {SubqlCustomHandler<EthereumHandlerKind.Event, EthereumLogFilter>}
 */
export type SubqlEventHandler = SubqlCustomHandler<EthereumHandlerKind.Event, EthereumLogFilter>;

/**
 * Represents a generic custom handler for Ethereum.
 * @interface
 * @template K - The kind of the handler (default: string).
 * @template F - The filter type for the handler (default: Record<string, unknown>).
 */
export interface SubqlCustomHandler<K extends string = string, F = Record<string, unknown>> {
  /**
   * The kind of handler. For `ethereum/Runtime` datasources this is either `Block`, `Call` or `Event` kinds.
   * The value of this will determine the filter options as well as the data provided to your handler function
   * @type {EthereumHandlerKind.Block | EthereumHandlerKind.Call | EthereumHandlerKind.Event | string }
   * @example
   * kind: EthereumHandlerKind.Block // Defined with an enum, this is used for runtime datasources

   */
  kind: K;
  /**
   * The name of your handler function. This must be defined and exported from your code.
   * @type {string}
   * @example
   * handler: 'handleBlock'
   */
  handler: string;
  /**
   * The filter for the handler. The handler kind will determine the possible filters (optional).
   *
   * @type {F}
   */
  filter?: F;
}

/**
 * Represents a runtime handler for Ethereum, which can be a block handler, transaction handler, or log handler.
 * @type {SubqlBlockHandler | SubqlCallHandler | SubqlEventHandler}
 */
export type SubqlRuntimeHandler = SubqlBlockHandler | SubqlCallHandler | SubqlEventHandler;

/**
 * Represents a handler for Ethereum, which can be a runtime handler or a custom handler with unknown filter type.
 * @type {SubqlRuntimeHandler | SubqlCustomHandler<string, unknown>}
 */
export type SubqlHandler = SubqlRuntimeHandler | SubqlCustomHandler<string, unknown>;

/**
 * Represents a filter for Ethereum runtime handlers, which can be a block filter, call filter, or event filter.
 * @type {EthereumBlockFilter | EthereumTransactionFilter | EthereumLogFilter}
 */
export type SubqlHandlerFilter = EthereumBlockFilter | EthereumTransactionFilter | EthereumLogFilter;

/**
 * Represents a mapping for Ethereum handlers, extending FileReference.
 * @interface
 * @extends {FileReference}
 */
export interface SubqlMapping<T extends SubqlHandler = SubqlHandler> extends FileReference {
  /**
   * An array of handlers associated with the mapping.
   * @type {T[]}
   * @example
   * handlers: [{
        kind: EthereumHandlerKind.Call,
        handler: 'handleTransfer',
        filter: {
          to: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
        }
      }]
   */
  handlers: T[];
}

/**
 * Represents a Ethereum datasource interface with generic parameters.
 * @interface
 * @template M - The mapping type for the datasource.
 */
interface ISubqlDatasource<M extends SubqlMapping> extends BaseDataSource {
  /**
   * The kind of the datasource.
   * @type {string}
   * @example
   * kind: 'ethereum/Runtime'
   */
  kind: string;
  /**
   * The starting block number for the datasource. If not specified, 1 will be used (optional).
   * @type {number}
   * @default 1
   */
  startBlock?: number;
  /**
   * The mapping associated with the datasource.
   * This contains the handlers.
   * @type {M}
   */
  mapping: M;
}

export interface SubqlEthereumProcessorOptions {
  /**
   * The name of the abi that is provided in the assets
   * This is the abi that will be used to decode transaction or log arguments
   * @example
   * abi: 'erc20',
   * */
  abi?: string;
  /**
   * The specific contract that this datasource should filter.
   * Alternatively this can be left blank and a transaction to filter can be used instead
   * @example
   * address: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
   * */
  address?: string;
}

/**
 * Represents a runtime datasource for Ethereum.
 * @interface
 * @template M - The mapping type for the datasource (default: SubqlMapping<SubqlRuntimeHandler>).
 */
export interface SubqlRuntimeDatasource<M extends SubqlMapping<SubqlRuntimeHandler> = SubqlMapping<SubqlRuntimeHandler>>
  extends ISubqlDatasource<M> {
  /**
   * The kind of the datasource, which is `ethereum/Runtime`.
   * @type {EthereumDatasourceKind.Runtime}
   */
  kind: EthereumDatasourceKind.Runtime;
  /**
   * Options to specify details about the contract and its interface
   * @example
   * options: {
   *   abi: 'erc20',
   *   address: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
   * }
   * */
  options?: SubqlEthereumProcessorOptions;
  /**
   * ABI or contract artifact files that are used for decoding.
   * These are used for codegen to generate handler inputs and contract interfaces
   * @example
   * assets: new Map([
   *  ['erc721', { file: "./abis/erc721.json" }],
   *  ['erc1155', { file: "./abis/erc1155.json" }],
   * ])
   * */
  assets?: Map<string, FileReference>;
}

export type SubqlDatasource = SubqlRuntimeDatasource | SubqlCustomDatasource;

export interface SubqlCustomDatasource<
  K extends string = string,
  M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>,
  O = any
> extends BaseCustomDataSource<SubqlHandler, M> /*ISubqlDatasource<M>*/ {
  /**
   * The kind of the datasource, which is `ethereum/Runtime`.
   * @type {K}
   */
  kind: K;
  /**
   * Options to specify details about the contract and its interface
   * @example
   * options: {
   *   abi: 'erc20',
   *   address: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
   * }
   * */
  options?: SubqlEthereumProcessorOptions;
  /**
   * ABI or contract artifact files that are used for decoding.
   * These are used for codegen to generate handler inputs and contract interfaces
   * @example
   * assets: new Map([
   *  ['erc721', { file: "./abis/erc721.json" }],
   *  ['erc1155', { file: "./abis/erc1155.json" }],
   * ])
   * */
  assets?: Map<string, FileReference>;
  /**
   * @example
   * processor: {
   *    file: './node_modules/@subql/frontier-evm-processor/dist/bundle.js',
   *    options: {
   *      abi: 'erc20',
   *      address: '0x322E86852e492a7Ee17f28a78c663da38FB33bfb',
   *    }
   *  }
   */
  processor: Processor<O>;
}

export type SecondLayerHandlerProcessor<
  K extends EthereumHandlerKind,
  F extends Record<string, unknown>, // EthereumRuntimeFilterMap?
  E,
  DS extends SubqlCustomDatasource = SubqlCustomDatasource
> =
  | SecondLayerHandlerProcessor_0_0_0<EthereumRuntimeFilterMap, K, F, E, DS, ApiWrapper>
  | SecondLayerHandlerProcessor_1_0_0<EthereumRuntimeFilterMap, K, F, E, DS, ApiWrapper>;

export type SecondLayerHandlerProcessorArray<
  K extends string,
  F extends Record<string, unknown>,
  T,
  DS extends SubqlCustomDatasource<K> = SubqlCustomDatasource<K>
> =
  | SecondLayerHandlerProcessor<EthereumHandlerKind.Block, F, T, DS>
  | SecondLayerHandlerProcessor<EthereumHandlerKind.Call, F, T, DS>
  | SecondLayerHandlerProcessor<EthereumHandlerKind.Event, F, T, DS>;

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
 * Represents a Ethereum subquery network configuration, which is based on the CommonSubqueryNetworkConfig template.
 * @type {IProjectNetworkConfig}
 */
export type EthereumNetworkConfig = IProjectNetworkConfig;

/**
 * Represents a Ethereum project configuration based on the CommonSubqueryProject template.
 * @type {CommonSubqueryProject<EthereumNetworkConfig, SubqlDatasource, RuntimeDatasourceTemplate | CustomDatasourceTemplate>}
 */
export type EthereumProject<DS extends SubqlDatasource = SubqlRuntimeDatasource> = CommonSubqueryProject<
  EthereumNetworkConfig,
  SubqlRuntimeDatasource | DS,
  BaseTemplateDataSource<SubqlRuntimeDatasource> | BaseTemplateDataSource<DS>
>;
