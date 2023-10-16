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

export type RuntimeDatasourceTemplate = BaseTemplateDataSource<CosmosRuntimeDatasource>;
export type CustomDatasourceTemplate = BaseTemplateDataSource<CosmosCustomDatasource>;

export type CosmosProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  CosmosRuntimeDatasource | CosmosCustomDatasource,
  RuntimeDatasourceTemplate | CustomDatasourceTemplate,
  CosmosNetworkConfig
>;

export interface CustomModule extends FileReference {
  /**
   * The messages within the file to import
   * @example
   * messages: ["MsgEthereumTx", "LegacyTx", "AccessListTx". "DynamicFeeTx"],
   * */
  messages: string[];
}

export type CosmosChaintypes = Map<string, CustomModule>;

export type CustomDataSourceAsset = FileReference;

export enum CosmosDatasourceKind {
  Runtime = 'cosmos/Runtime',
  Custom = 'cosmos/Custom',
}

/**
 * Enum representing the kind of Cosmos handler.
 * @enum {string}
 */
export enum CosmosHandlerKind {
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
  [CosmosHandlerKind.Block]: CosmosBlock;
  [CosmosHandlerKind.Transaction]: CosmosTransaction;
  [CosmosHandlerKind.Message]: CosmosMessage;
  [CosmosHandlerKind.Event]: CosmosEvent;
};

type CosmosRuntimeFilterMap = {
  [CosmosHandlerKind.Block]: {};
  [CosmosHandlerKind.Transaction]: {};
  [CosmosHandlerKind.Message]: CosmosMessageFilter;
  [CosmosHandlerKind.Event]: CosmosEventFilter;
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
   * chaintypes: {
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
  chaintypes?: CosmosChaintypes;
};

export type CosmosBlockFilter = BlockFilter;

export interface CosmosTxFilter {
  /**
   * Filter in failed transactions
   * @example
   * includeFailedTx: true,
   * */
  includeFailedTx?: boolean;
}

/**
 * Represents a filter for Cosmos messages, extending CosmosTxFilter.
 * @interface
 * @extends {CosmosTxFilter}
 */
export interface CosmosMessageFilter extends CosmosTxFilter {
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
 * @extends {CosmosEventFilter}
 */
export interface CosmosEventFilter {
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
  messageFilter?: CosmosMessageFilter;
  /**
   * Attributes of the event to filter by
   * */
  attributes?: Record<string, string | number>;
}

export type CosmosHandlerFilter = CosmosEventFilter | CosmosMessageFilter;

/**
 * Represents a handler for Cosmos blocks.
 * @type {CosmosCustomHandler<CosmosHandlerKind.Block, CosmosBlockFilter>}
 */
export type CosmosBlockHandler = CosmosCustomHandler<CosmosHandlerKind.Block, CosmosBlockFilter>;
/**
 * Represents a handler for Cosmos transactions.
 * @type {CosmosCustomHandler<CosmosHandlerKind.Transaction, CosmosTxFilter>}
 */
export type CosmosTransactionHandler = CosmosCustomHandler<CosmosHandlerKind.Transaction, CosmosTxFilter>;
/**
 * Represents a handler for Cosmos messages.
 * @type {CosmosCustomHandler<CosmosHandlerKind.Message, CosmosMessageFilter>}
 */
export type CosmosMessageHandler = CosmosCustomHandler<CosmosHandlerKind.Message, CosmosMessageFilter>;
/**
 * Represents a handler for Cosmos events.
 * @type {CosmosCustomHandler<CosmosHandlerKind.Event, CosmosEventFilter>}
 */
export type CosmosEventHandler = CosmosCustomHandler<CosmosHandlerKind.Event, CosmosEventFilter>;

/**
 * Represents a generic custom handler for Cosmos.
 * @interface
 * @template K - The kind of the handler (default: string).
 * @template F - The filter type for the handler (default: Record<string, unknown>).
 */
export interface CosmosCustomHandler<K extends string = string, F = Record<string, unknown>> extends BaseHandler<F, K> {
  /**
   * The kind of handler. For `cosmos/Runtime` datasources this is either `Block`, `Transaction`, `Message` or `Event` kinds.
   * The value of this will determine the filter options as well as the data provided to your handler function
   * @type {CosmosHandlerKind.Block | CosmosHandlerKind.Transaction | CosmosHandlerKind.Message | CosmosHandlerKind.Event | string }
   * @example
   * kind: CosmosHandlerKind.Block // Defined with an enum, this is used for runtime datasources
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
 * @type {CosmosBlockHandler | CosmosTransactionHandler | CosmosMessageHandler | CosmosEventHandler}
 */
export type CosmosRuntimeHandler =
  | CosmosBlockHandler
  | CosmosTransactionHandler
  | CosmosMessageHandler
  | CosmosEventHandler;

export type CosmosHandler = CosmosRuntimeHandler | CosmosCustomHandler;

/**
 * Represents a mapping for Cosmos handlers, extending FileReference.
 * @interface
 * @extends {FileReference}
 */
export interface CosmosMapping<T extends CosmosHandler = CosmosHandler> extends BaseMapping<T> {
  /**
   * An array of handlers associated with the mapping.
   * @type {T[]}
   * @example
   * handlers: [{
        kind: CosmosHandlerKind.Call,
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
type ICosmosDatasource<M extends CosmosMapping> = BaseDataSource<CosmosHandler, M>;

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
 * @template M - The mapping type for the datasource (default: CosmosMapping<CosmosRuntimeHandler>).
 */
export interface CosmosRuntimeDatasource<
  M extends CosmosMapping<CosmosRuntimeHandler> = CosmosMapping<CosmosRuntimeHandler>
> extends ICosmosDatasource<M> {
  /**
   * The kind of the datasource, which is `cosmos/Runtime`.
   * @type {CosmosDatasourceKind.Runtime}
   */
  kind: CosmosDatasourceKind.Runtime;
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
 * @type {CosmosDatasource}
 */
export type CosmosDatasource = CosmosRuntimeDatasource | CosmosCustomDatasource;

export type CustomCosmosDataSourceAsset = FileReference;

/**
 * Represents a custom datasource for Cosmos.
 * @interface
 * @template K - The kind of the datasource (default: string).
 * @template M - The mapping type for the datasource (default: CosmosMapping<CosmosCustomHandler>).
 * @template O - The processor options (default: any).
 */
export interface CosmosCustomDatasource<
  K extends string = string,
  M extends CosmosMapping = CosmosMapping<CosmosCustomHandler>,
  O = any
> extends BaseCustomDataSource<CosmosHandler, M> {
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
  T extends CosmosHandlerKind,
  E,
  DS extends CosmosCustomDatasource = CosmosCustomDatasource
> {
  (input: CosmosRuntimeHandlerInputMap[T], ds: DS, api: CosmWasmClient, assets?: Record<string, string>): Promise<E>;
}

export interface HandlerInputTransformer_1_0_0<
  T extends CosmosHandlerKind,
  F,
  E,
  DS extends CosmosCustomDatasource = CosmosCustomDatasource
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
  DS extends CosmosCustomDatasource<K> = CosmosCustomDatasource<K>
> =
  | SecondLayerHandlerProcessor<CosmosHandlerKind.Block, F, T, DS>
  | SecondLayerHandlerProcessor<CosmosHandlerKind.Transaction, F, T, DS>
  | SecondLayerHandlerProcessor<CosmosHandlerKind.Message, F, T, DS>
  | SecondLayerHandlerProcessor<CosmosHandlerKind.Event, F, T, DS>;

export interface CosmosDatasourceProcessor<
  K extends string,
  F,
  DS extends CosmosCustomDatasource<K> = CosmosCustomDatasource<K>,
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
  K extends CosmosHandlerKind,
  F,
  DS extends CosmosCustomDatasource = CosmosCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: CosmosRuntimeFilterMap[K] | CosmosRuntimeFilterMap[K][];
  filterValidator: (filter?: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry | undefined;
}

export interface SecondLayerHandlerProcessor_0_0_0<
  K extends CosmosHandlerKind,
  F,
  E,
  DS extends CosmosCustomDatasource = CosmosCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: undefined;
  transformer: HandlerInputTransformer_0_0_0<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: CosmosRuntimeHandlerInputMap[K], ds: DS) => boolean;
}

export interface SecondLayerHandlerProcessor_1_0_0<
  K extends CosmosHandlerKind,
  F,
  E,
  DS extends CosmosCustomDatasource = CosmosCustomDatasource
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
  K extends CosmosHandlerKind,
  F,
  E,
  DS extends CosmosCustomDatasource = CosmosCustomDatasource
> = SecondLayerHandlerProcessor_0_0_0<K, F, E, DS> | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>;

/**
 * Represents a Cosmos project configuration based on the CommonSubqueryProject template.
 */
export type CosmosProject<DS extends CosmosDatasource = CosmosRuntimeDatasource> = CommonSubqueryProject<
  CosmosNetworkConfig,
  CosmosRuntimeDatasource | DS,
  BaseTemplateDataSource<CosmosRuntimeDatasource> | BaseTemplateDataSource<DS>
>;
