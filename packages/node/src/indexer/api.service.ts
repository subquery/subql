// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise } from '@polkadot/api';
import {
  ApiTypes,
  DecoratedRpcSection,
  RpcMethodResult,
} from '@polkadot/api/types';
import { RuntimeVersion, Header } from '@polkadot/types/interfaces';
import {
  AnyFunction,
  DefinitionRpcExt,
  RegisteredTypes,
} from '@polkadot/types/types';
import { OverrideBundleDefinition } from '@polkadot/types/types/registry';
import {
  IndexerEvent,
  getLogger,
  NodeConfig,
  profilerWrap,
  ConnectionPoolService,
  ApiService as BaseApiService,
  IBlock,
  MetadataMismatchError,
  exitWithError,
} from '@subql/node-core';
import { SubstrateNetworkConfig } from '@subql/types';
import { IEndpointConfig } from '@subql/types-core';
import { SubstrateNodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { isOnlyEventHandlers } from '../utils/project';
import * as SubstrateUtil from '../utils/substrate';
import {
  ApiPromiseConnection,
  FetchFunc,
  GetFetchFunc,
} from './apiPromise.connection';
import { ApiAt, BlockContent, LightBlockContent } from './types';

const NOT_SUPPORT = (name: string) => () => {
  throw new Error(`${name}() is not supported`);
};

// https://github.com/polkadot-js/api/blob/12750bc83d8d7f01957896a80a7ba948ba3690b7/packages/rpc-provider/src/ws/index.ts#L43
const MAX_RECONNECT_ATTEMPTS = 5;

const logger = getLogger('api');

// This is a temp fix for https://github.com/polkadot-js/api/issues/5871
function overrideConsoleWarn(): void {
  (console as any).oldWarn = console.warn;
  console.warn = function () {
    // eslint-disable-next-line prefer-rest-params
    const args = Array.from(arguments);

    if (
      args.length > 0 &&
      args[0].includes('Unable to map [u8; 32] to a lookup index')
    ) {
      return;
    }
    (console as any).oldWarn.apply(console, args);
  };
}

async function dynamicImportHasher(
  methodName: string,
): Promise<(data: Uint8Array) => Uint8Array> {
  const module = await import('@polkadot/util-crypto');
  const method = module[methodName as keyof typeof module];
  if (method) {
    return method as (data: Uint8Array) => Uint8Array;
  } else {
    throw new Error(
      `Hasher Method ${methodName} not found in @polkadot/util-crypto`,
    );
  }
}

async function updateChainTypesHasher(
  chainTypes: any,
): Promise<RegisteredTypes | undefined> {
  if (!chainTypes) {
    return undefined;
  }
  if (chainTypes.hasher && typeof chainTypes.hasher === 'string') {
    logger.info(`Set overall spec hasher to ${chainTypes.hasher}`);
    chainTypes.hasher = await dynamicImportHasher(chainTypes.hasher);
  }
  const typesBundleSpecs: Record<string, OverrideBundleDefinition> | undefined =
    chainTypes.typesBundle?.spec;
  if (typesBundleSpecs) {
    for (const [key, spec] of Object.entries(typesBundleSpecs)) {
      if (spec.hasher && typeof spec.hasher === 'string') {
        logger.info(`Set spec ${key} hasher to ${spec.hasher}`);
        spec.hasher = await dynamicImportHasher(spec.hasher);
      }
    }
  }
  return chainTypes;
}

@Injectable()
export class ApiService
  extends BaseApiService<
    ApiPromise,
    ApiAt,
    IBlock<BlockContent>[] | IBlock<LightBlockContent>[],
    ApiPromiseConnection,
    IEndpointConfig
  >
  implements OnApplicationShutdown
{
  private _fetchBlocksFunction?: FetchFunc;
  private fetchBlocksBatches: GetFetchFunc = () => this.fetchBlocksFunction;
  private _currentBlockHash?: string;
  private _currentBlockNumber?: number;

  private nodeConfig: SubstrateNodeConfig;

  constructor(
    @Inject('ISubqueryProject') private project: SubqueryProject,
    connectionPoolService: ConnectionPoolService<ApiPromiseConnection>,
    eventEmitter: EventEmitter2,
    nodeConfig: NodeConfig,
  ) {
    super(connectionPoolService, eventEmitter);
    this.nodeConfig = new SubstrateNodeConfig(nodeConfig);

    this.updateBlockFetching();
  }

  private get fetchBlocksFunction(): FetchFunc {
    assert(this._fetchBlocksFunction, 'fetchBlocksFunction not initialized');
    return this._fetchBlocksFunction;
  }

  private get currentBlockHash(): string {
    assert(this._currentBlockHash, 'currentBlockHash not initialized');
    return this._currentBlockHash;
  }

  private set currentBlockHash(value: string) {
    this._currentBlockHash = value;
  }

  private get currentBlockNumber(): number {
    assert(this._currentBlockNumber, 'currentBlockNumber not initialized');
    return this._currentBlockNumber;
  }

  private set currentBlockNumber(value: number) {
    this._currentBlockNumber = value;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connectionPoolService.onApplicationShutdown();
  }

  async init(): Promise<ApiService> {
    overrideConsoleWarn();
    let chainTypes: RegisteredTypes | undefined;
    let network: SubstrateNetworkConfig;
    try {
      chainTypes = await updateChainTypesHasher(this.project.chainTypes);
      network = this.project.network;

      if (this.nodeConfig.primaryNetworkEndpoint) {
        const [endpoint, config] = this.nodeConfig.primaryNetworkEndpoint;
        (network.endpoint as Record<string, IEndpointConfig>)[endpoint] =
          config;
      }
    } catch (e) {
      exitWithError(new Error(`Failed to init api`, { cause: e }), logger);
    }

    if (chainTypes) {
      logger.info('Using provided chain types');
    }

    await this.createConnections(
      network,
      //createConnection
      (endpoint, config) =>
        ApiPromiseConnection.create(
          endpoint,
          this.fetchBlocksBatches,
          {
            chainTypes,
          },
          config,
        ),
      //postConnectedHook
      (connection: ApiPromiseConnection, endpoint: string, index: number) => {
        const api = connection.unsafeApi;
        api.on('connected', () => {
          this.eventEmitter.emit(IndexerEvent.ApiConnected, {
            value: 1,
            apiIndex: index,
            endpoint: endpoint,
          });
        });
        api.on('disconnected', () => {
          this.eventEmitter.emit(IndexerEvent.ApiConnected, {
            value: 0,
            apiIndex: index,
            endpoint: endpoint,
          });
        });
      },
    );
    return this;
  }

  async updateChainTypes(): Promise<void> {
    const chainTypes = await updateChainTypesHasher(this.project.chainTypes);
    await this.connectionPoolService.updateChainTypes(chainTypes);
  }

  updateBlockFetching(): void {
    const onlyEventHandlers = isOnlyEventHandlers(this.project);
    const skipTransactions =
      this.nodeConfig.skipTransactions && onlyEventHandlers;

    if (this.nodeConfig.skipTransactions) {
      if (onlyEventHandlers) {
        logger.info(
          'skipTransactions is enabled, only events and block headers will be fetched.',
        );
      } else {
        logger.info(
          `skipTransactions is disabled, the project contains handlers that aren't event handlers.`,
        );
      }
    } else {
      if (onlyEventHandlers) {
        logger.warn(
          'skipTransactions is disabled, the project contains only event handlers, it could be enabled to improve indexing performance.',
        );
      } else {
        logger.info(`skipTransactions is disabled.`);
      }
    }

    const fetchFunc = skipTransactions
      ? SubstrateUtil.fetchBlocksBatchesLight
      : SubstrateUtil.fetchBlocksBatches;

    if (this.nodeConfig?.profiler) {
      this._fetchBlocksFunction = profilerWrap(
        fetchFunc,
        'SubstrateUtil',
        'fetchBlocksBatches',
      );
    } else {
      this._fetchBlocksFunction = fetchFunc;
    }
  }

  get api(): ApiPromise {
    return this.unsafeApi;
  }

  async getPatchedApi(
    header: Header,
    runtimeVersion?: RuntimeVersion,
  ): Promise<ApiAt> {
    this.currentBlockHash = header.hash.toString();
    this.currentBlockNumber = header.number.toNumber();

    const api = this.api;
    const apiAt = (await api.at(
      this.currentBlockHash,
      runtimeVersion,
    )) as ApiAt;
    this.patchApiRpc(api, apiAt);
    return apiAt;
  }

  private redecorateRpcFunction<T extends ApiTypes>(
    original: RpcMethodResult<T, AnyFunction>,
  ): RpcMethodResult<T, AnyFunction> {
    const methodName = this.getRPCFunctionName(original);
    if (original.meta.params) {
      const hashIndex = original.meta.params.findIndex(
        ({ isHistoric }) => isHistoric,
      );
      if (hashIndex > -1) {
        const isBlockNumber =
          original.meta.params[hashIndex].type === 'BlockNumber';

        const ret = (async (...args: any[]) => {
          const argsClone = [...args];

          if (isBlockNumber) {
            if (argsClone[hashIndex] === undefined) {
              argsClone[hashIndex] = this.currentBlockNumber;
            } else if (argsClone[hashIndex] > this.currentBlockNumber) {
              throw new Error(
                `input block ${argsClone[hashIndex]} ahead of current block ${this.currentBlockNumber} is not supported`,
              );
            }
          }
          // is block hash
          else {
            if (argsClone[hashIndex] === undefined) {
              argsClone[hashIndex] = this.currentBlockHash;
            } else {
              const atBlock = await this.api.rpc.chain.getBlock(
                argsClone[hashIndex],
              );
              const atBlockNumber = atBlock.block.header.number.toNumber();
              if (atBlockNumber > this.currentBlockNumber) {
                throw new Error(
                  `input block hash ${argsClone[hashIndex]} ahead of current block ${this.currentBlockNumber} is not supported`,
                );
              }
            }
          }

          return original(...argsClone);
        }) as RpcMethodResult<T, AnyFunction>;
        ret.raw = NOT_SUPPORT(`${methodName}.raw`);
        ret.meta = original.meta;
        return ret;
      }
    }

    const ret = NOT_SUPPORT(methodName) as unknown as RpcMethodResult<
      T,
      AnyFunction
    >;
    ret.raw = NOT_SUPPORT(`${methodName}.raw`);
    ret.meta = original.meta;
    return ret;
  }

  private patchApiRpc<T extends ApiTypes = 'promise'>(
    api: ApiPromise,
    apiAt: ApiAt,
  ): void {
    apiAt.rpc = Object.entries(api.rpc).reduce(
      (acc, [module, rpcMethods]) => {
        acc[module as keyof ApiPromise['rpc']] = Object.entries(
          rpcMethods,
        ).reduce(
          (accInner, [name, rpcPromiseResult]) => {
            accInner[name] = this.redecorateRpcFunction<T>(
              rpcPromiseResult as RpcMethodResult<T, AnyFunction>,
            );
            return accInner;
          },
          {} as DecoratedRpcSection<T, any>,
        ) as any;
        return acc;
      },
      {} as ApiPromise['rpc'],
    );
  }

  private getRPCFunctionName<T extends 'promise' | 'rxjs'>(
    original: RpcMethodResult<T, AnyFunction>,
  ): string {
    const ext = original.meta as unknown as DefinitionRpcExt;

    return `api.rpc.${ext?.section ?? '*'}.${ext?.method ?? '*'}`;
  }

  // Overrides the super function because of the specVer
  async fetchBlocks(
    heights: number[],
    overallSpecVer?: number,
    numAttempts = MAX_RECONNECT_ATTEMPTS,
  ): Promise<IBlock<LightBlockContent>[] | IBlock<BlockContent>[]> {
    return this.retryFetch(async () => {
      // Get the latest fetch function from the provider
      const apiInstance = this.connectionPoolService.api;
      return apiInstance.fetchBlocks(heights, overallSpecVer);
    }, numAttempts);
  }

  // Polkadot uses genesis hash instead of chainId
  protected assertChainId(
    network: { chainId: string },
    connection: ApiPromiseConnection,
  ): void {
    if (network.chainId !== connection.networkMeta.genesisHash) {
      throw new MetadataMismatchError(
        'ChainId',
        network.chainId,
        connection.networkMeta.genesisHash,
      );
    }
  }
}
