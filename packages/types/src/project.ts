// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {CosmWasmClient} from '@cosmjs/cosmwasm-stargate';
import {Registry} from '@cosmjs/proto-signing';
import {
  BaseTemplateDataSource,
  IProjectNetworkConfig,
  CommonSubqueryProject,
  DictionaryQueryEntry,
  FileReference,
  Processor,
  ProjectManifestV1_0_0,
  BlockFilter,
  BaseHandler,
  BaseMapping,
  BaseDataSource,
  BaseCustomDataSource,
} from '@subql/types-core';
import {CosmosBlock, CosmosTransaction, CosmosMessage, CosmosEvent} from './interfaces';

export type RuntimeDatasourceTemplate = BaseTemplateDataSource<SubqlCosmosDatasource>;
export type CustomDatasourceTemplate = BaseTemplateDataSource<SubqlCosmosCustomDatasource>;

export type CosmosProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  SubqlCosmosRuntimeDatasource | SubqlCosmosCustomDatasource
>;

export interface CustomModule extends FileReference {
  /**
   * The messages within the file to import
   * @example
   * messages: ["MsgEthereumTx", "LegacyTx", "AccessListTx". "DynamicFeeTx"],
   * */
  messages: string[];
}

export type CustomDataSourceAsset = FileReference;

export enum SubqlCosmosDatasourceKind {
  Runtime = 'cosmos/Runtime',
  Custom = 'cosmos/Custom',
}

/**
 * Enum representing the kind of Cosmos handler.
 * @enum {string}
 */
export enum SubqlCosmosHandlerKind {
  /**
   * Handler for Cosmos blocks.
   */
  Block = 'cosmos/BlockHandler',
  /**
   * Handler for Cosmos transactions.
   */
  Transaction = 'cosmos/TransactionHandler',
  /**
   * Handler for Cosmos messages.
   */
  Message = 'cosmos/MessageHandler',
  /**
   * Handler for Cosmos events.
   */
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

/**
 * Represents a Cosmos subquery network configuration, which is based on the CommonSubqueryNetworkConfig template.
 * @type {IProjectNetworkConfig}
 */
export type CosmosNetworkConfig = IProjectNetworkConfig & {
  /**
   * Messages custom to the chain that will need to be decoded.
   * If filters do not pick up these message types they don't need to be added.
   * The key needs to be a unique value, it's good to have the same key as the package but if there are multiple files with the same package then change the name.
   * @example
   * chainTypes: {
      ethermint.evm.v1: {
        file: "./proto/ethermint/evm/v1/tx.proto",
        messages: [
          "MsgEthereumTx",
          "LegacyTx",
          "AccessListTx",
          "DynamicFeeTx",
        ]
      }
    }
   * */
  chainTypes?: Map<string, CustomModule>;
};

export type SubqlCosmosBlockFilter = BlockFilter;

export interface SubqlCosmosTxFilter {
  /**
   * Filter in failed transactions
   * @example
   * includeFailedTx: true,
   * */
  includeFailedTx?: boolean;
}

/**
 * Represents a filter for Cosmos messages, extending SubqlCosmosTxFilter.
 * @interface
 * @extends {SubqlCosmosTxFilter}
 */
export interface SubqlCosmosMessageFilter extends SubqlCosmosTxFilter {
  /**
   * The type of message, this matches the protobuf message descriptor
   * @example
   * type: "/cosmwasm.wasm.v1.MsgExecuteContract",
   * */
  type: string;
  contractCall?: string;
  /**
   * Filter by the arguments to the message
   * @example
   * values: {
      contract: "juno128lewlw6kv223uw4yzdffl8rnh3k9qs8vrf6kef28579w8ygccyq7m90n2"
     }
   */
  values?: {
    [key: string]: string;
  };
}

/**
 * Represents a filter for Cosmos events.
 * @interface
 * @extends {SubqlCosmosEventFilter}
 */
export interface SubqlCosmosEventFilter {
  /**
   * The type of the event
   * @example
   * type: 'wasm',
   * */
  type: string;
  /**
   * A message filter to filter events from a message
   * @example
   * messageFilter: {
       type: "/cosmwasm.wasm.v1.MsgExecuteContract"
       values: {
         contract: "juno128lewlw6kv223uw4yzdffl8rnh3k9qs8vrf6kef28579w8ygccyq7m90n2"
       }
     }
   * */
  messageFilter?: SubqlCosmosMessageFilter;
  /**
   * Attributes of the event to filter by
   * */
  attributes?: Record<string, string | number>;
}

export type SubqlCosmosHandlerFilter = SubqlCosmosEventFilter | SubqlCosmosMessageFilter;

/**
 * Represents a handler for Cosmos blocks.
 * @type {SubqlCosmosCustomHandler<SubqlCosmosHandlerKind.Block, SubqlCosmosBlockFilter>}
 */
export type SubqlCosmosBlockHandler = SubqlCosmosCustomHandler<SubqlCosmosHandlerKind.Block, SubqlCosmosBlockFilter>;
/**
 * Represents a handler for Cosmos transactions.
 * @type {SubqlCosmosCustomHandler<SubqlCosmosHandlerKind.Transaction, SubqlCosmosTxFilter>}
 */
export type SubqlCosmosTransactionHandler = SubqlCosmosCustomHandler<
  SubqlCosmosHandlerKind.Transaction,
  SubqlCosmosTxFilter
>;
/**
 * Represents a handler for Cosmos messages.
 * @type {SubqlCosmosCustomHandler<SubqlCosmosHandlerKind.Message, SubqlCosmosMessageFilter>}
 */
export type SubqlCosmosMessageHandler = SubqlCosmosCustomHandler<
  SubqlCosmosHandlerKind.Message,
  SubqlCosmosMessageFilter
>;
/**
 * Represents a handler for Cosmos events.
 * @type {SubqlCosmosCustomHandler<SubqlCosmosHandlerKind.Event, SubqlCosmosEventFilter>}
 */
export type SubqlCosmosEventHandler = SubqlCosmosCustomHandler<SubqlCosmosHandlerKind.Event, SubqlCosmosEventFilter>;

/**
 * Represents a generic custom handler for Cosmos.
 * @interface
 * @template K - The kind of the handler (default: string).
 * @template F - The filter type for the handler (default: Record<string, unknown>).
 */
export interface SubqlCosmosCustomHandler<K extends string = string, F = Record<string, unknown>>
  extends BaseHandler<F, K> {
  /**
   * The kind of handler. For `cosmos/Runtime` datasources this is either `Block`, `Transaction`, `Message` or `Event` kinds.
   * The value of this will determine the filter options as well as the data provided to your handler function
   * @type {SubqlCosmosHandlerKind.Block | SubqlCosmosHandlerKind.Transaction | SubqlCosmosHandlerKind.Message | SubqlCosmosHandlerKind.Event | string }
   * @example
   * kind: SubqlCosmosHandlerKind.Block // Defined with an enum, this is used for runtime datasources
   * @example
   * kind: 'cosmos/EthermintEvmEvent' // Defined with a string, this is used with custom datasources
   */
  kind: K;
  /**
   * The filter for the handler. The handler kind will determine the possible filters (optional).
   *
   * @type {F}
   */
  filter?: F;
}

/**
 * Represents a runtime handler for Cosmos, which can be a block handler, transaction handler, message handler, or event handler.
 * @type {SubqlCosmosBlockHandler | SubqlCosmosTransactionHandler | SubqlCosmosMessageHandler | SubqlCosmosEventHandler}
 */
export type SubqlCosmosRuntimeHandler =
  | SubqlCosmosBlockHandler
  | SubqlCosmosTransactionHandler
  | SubqlCosmosMessageHandler
  | SubqlCosmosEventHandler;

export type SubqlCosmosHandler = SubqlCosmosRuntimeHandler | SubqlCosmosCustomHandler;

/**
 * Represents a mapping for Cosmos handlers, extending FileReference.
 * @interface
 * @extends {FileReference}
 */
export interface SubqlCosmosMapping<T extends SubqlCosmosHandler = SubqlCosmosHandler> extends BaseMapping<T> {
  /**
   * An array of handlers associated with the mapping.
   * @type {T[]}
   * @example
   * handlers: [{
        kind: SubqlCosmosHandlerKind.Call,
        handler: 'handleCall',
        filter: {
          type: "/cosmwasm.wasm.v1.MsgExecuteContract"
        }
      }]
   */
  handlers: T[];
}

/**
 * Represents a Cosmos datasource interface with generic parameters.
 * @interface
 * @template M - The mapping type for the datasource.
 */
type ISubqlCosmosDatasource<M extends SubqlCosmosMapping> = BaseDataSource<SubqlCosmosHandler, M>;

export interface SubqlCosmosProcessorOptions {
  /**
   * The name of the ABI referenced in assets to be used with this datasource
   * This is used for codegen with cosmwasm
   * @example
   * api: 'cw20',
   * */
  abi?: string;
}

/**
 * Represents a runtime datasource for Cosmos.
 * @interface
 * @template M - The mapping type for the datasource (default: SubqlCosmosMapping<SubqlCosmosRuntimeHandler>).
 */
export interface SubqlCosmosRuntimeDatasource<
  M extends SubqlCosmosMapping<SubqlCosmosRuntimeHandler> = SubqlCosmosMapping<SubqlCosmosRuntimeHandler>
> extends ISubqlCosmosDatasource<M> {
  /**
   * The kind of the datasource, which is `cosmos/Runtime`.
   * @type {SubqlCosmosDatasourceKind.Runtime}
   */
  kind: SubqlCosmosDatasourceKind.Runtime;
  /**
   * Options for this datasource, this includes the abi if its a cosmwasm datasource
   * @type {SubqlCosmosProcessorOptions}
   * */
  options?: SubqlCosmosProcessorOptions;
  /**
   * Assets used by this datasource, these can be used in options.abi
   * @example
   * assets: {cw20: {file: './cosmwasm-contract/cw20/schema/cw20.json'}}
   * */
  assets?: Map<string, FileReference>;
}

/**
 * Represents a Cosmos datasource, which can be either runtime or custom.
 * @type {SubqlCosmosDatasource}
 */
export type SubqlCosmosDatasource = SubqlCosmosRuntimeDatasource | SubqlCosmosCustomDatasource;

export type CustomCosmosDataSourceAsset = FileReference;

/**
 * Represents a custom datasource for Cosmos.
 * @interface
 * @template K - The kind of the datasource (default: string).
 * @template M - The mapping type for the datasource (default: SubqlCosmosMapping<SubqlCosmosCustomHandler>).
 * @template O - The processor options (default: any).
 */
export interface SubqlCosmosCustomDatasource<
  K extends string = string,
  M extends SubqlCosmosMapping = SubqlCosmosMapping<SubqlCosmosCustomHandler>,
  O = any
> extends BaseCustomDataSource<SubqlCosmosHandler, M> {
  /**
   * The kind of the custom datasource. This should follow the pattern `cosmos/*`.
   * @type {K}
   * @example
   * kind: 'cosmos/EthermintEvm'
   */
  kind: K;
  /**
   * The processor used for the custom datasource.
   * @type {Processor<O>}
   * @example
   * processor: {
   *    file: './node_modules/@subql/ethermint-evm-processor/dist/bundle.js',
   *    options: {
   *      abi: 'erc20',
   *      address: '0x322E86852e492a7Ee17f28a78c663da38FB33bfb',
   *    }
   *  }
   */
  processor: Processor<O>;
}

export interface HandlerInputTransformer_0_0_0<
  T extends SubqlCosmosHandlerKind,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource
> {
  (input: CosmosRuntimeHandlerInputMap[T], ds: DS, api: CosmWasmClient, assets?: Record<string, string>): Promise<E>;
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
  }): Promise<E[]>;
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
  filterProcessor: (params: {
    filter: F | undefined;
    input: CosmosRuntimeHandlerInputMap[K];
    ds: DS;
    registry: Registry;
  }) => boolean;
}

export type SecondLayerHandlerProcessor<
  K extends SubqlCosmosHandlerKind,
  F,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource
> = SecondLayerHandlerProcessor_0_0_0<K, F, E, DS> | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>;

/**
 * Represents a Cosmos project configuration based on the CommonSubqueryProject template.
 */
export type CosmosProject<DS extends SubqlCosmosDatasource = SubqlCosmosRuntimeDatasource> = CommonSubqueryProject<
  CosmosNetworkConfig,
  SubqlCosmosRuntimeDatasource | DS,
  BaseTemplateDataSource<SubqlCosmosRuntimeDatasource> | BaseTemplateDataSource<DS>
>;
