// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise } from '@polkadot/api';
import { RpcMethodResult } from '@polkadot/api/types';
import { RuntimeVersion, Header } from '@polkadot/types/interfaces';
import { AnyFunction, DefinitionRpcExt } from '@polkadot/types/types';
import {
  IndexerEvent,
  NetworkMetadataPayload,
  getLogger,
  NodeConfig,
  profilerWrap,
  ConnectionPoolService,
  ApiService as BaseApiService,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { isOnlyEventHandlers } from '../utils/project';
import * as SubstrateUtil from '../utils/substrate';
import { ApiPromiseConnection, FetchFunc } from './apiPromise.connection';
import { ApiAt, BlockContent, LightBlockContent } from './types';

const NOT_SUPPORT = (name: string) => () => {
  throw new Error(`${name}() is not supported`);
};

// https://github.com/polkadot-js/api/blob/12750bc83d8d7f01957896a80a7ba948ba3690b7/packages/rpc-provider/src/ws/index.ts#L43
const MAX_RECONNECT_ATTEMPTS = 5;
const TIMEOUT = 90 * 1000;

const logger = getLogger('api');

@Injectable()
export class ApiService
  extends BaseApiService<
    ApiPromise,
    ApiAt,
    BlockContent[] | LightBlockContent[]
  >
  implements OnApplicationShutdown
{
  private fetchBlocksBatches: FetchFunc;
  private currentBlockHash: string;
  private currentBlockNumber: number;
  networkMeta: NetworkMetadataPayload;

  constructor(
    @Inject('ISubqueryProject') private project: SubqueryProject,
    connectionPoolService: ConnectionPoolService<ApiPromiseConnection>,
    private eventEmitter: EventEmitter2,
    private nodeConfig: NodeConfig,
  ) {
    super(connectionPoolService);

    this.updateBlockFetching();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connectionPoolService.onApplicationShutdown();
  }

  private metadataMismatchError(
    metadata: string,
    expected: string,
    actual: string,
  ): Error {
    return Error(
      `Value of ${metadata} does not match across all endpoints\n
       Expected: ${expected}
       Actual: ${actual}`,
    );
  }

  async init(): Promise<ApiService> {
    let chainTypes, network;
    try {
      chainTypes = this.project.chainTypes;
      network = this.project.network;

      if (this.nodeConfig.primaryNetworkEndpoint) {
        network.endpoint.push(this.nodeConfig.primaryNetworkEndpoint);
      }
    } catch (e) {
      logger.error(e);
      process.exit(1);
    }

    const endpointToApiIndex: Record<string, ApiPromiseConnection> = {};

    if (chainTypes) {
      logger.info('Using provided chain types');
    }

    for await (const [i, endpoint] of network.endpoint.entries()) {
      const connection = await ApiPromiseConnection.create(
        endpoint,
        this.fetchBlocksBatches,
        {
          chainTypes,
        },
      );

      const api = connection.unsafeApi;

      this.eventEmitter.emit(IndexerEvent.ApiConnected, {
        value: 1,
        apiIndex: i,
        endpoint: endpoint,
      });

      api.on('connected', () => {
        this.eventEmitter.emit(IndexerEvent.ApiConnected, {
          value: 1,
          apiIndex: i,
          endpoint: endpoint,
        });
      });
      api.on('disconnected', () => {
        this.eventEmitter.emit(IndexerEvent.ApiConnected, {
          value: 0,
          apiIndex: i,
          endpoint: endpoint,
        });
      });

      if (!this.networkMeta) {
        this.networkMeta = connection.networkMeta;

        if (
          network.chainId &&
          network.chainId !== this.networkMeta.genesisHash
        ) {
          const err = new Error(
            `Network chainId doesn't match expected genesisHash. Your SubQuery project is expecting to index data from "${
              network.chainId ?? network.genesisHash
            }", however the endpoint that you are connecting to is different("${
              this.networkMeta.genesisHash
            }). Please check that the RPC endpoint is actually for your desired network or update the genesisHash.`,
          );
          logger.error(err, err.message);
          throw err;
        }
      } else {
        const genesisHash = api.genesisHash.toString();
        if (this.networkMeta.genesisHash !== genesisHash) {
          throw this.metadataMismatchError(
            'Genesis Hash',
            this.networkMeta.genesisHash,
            genesisHash,
          );
        }
      }

      endpointToApiIndex[endpoint] = connection;
    }

    await this.connectionPoolService.addBatchToConnections(endpointToApiIndex);
    return this;
  }

  updateBlockFetching(): void {
    const onlyEventHandlers = isOnlyEventHandlers(this.project);
    const skipBlock = this.nodeConfig.skipBlock && onlyEventHandlers;

    if (this.nodeConfig.skipBlock) {
      if (onlyEventHandlers) {
        logger.info(
          'skipBlock is enabled, only events and block headers will be fetched.',
        );
      } else {
        logger.info(
          `skipBlock is disabled, the project contains handlers that aren't event handlers.`,
        );
      }
    } else {
      if (onlyEventHandlers) {
        logger.warn(
          'skipBlock is disabled, the project contains only event handlers, it could be enabled to improve indexing performance.',
        );
      } else {
        logger.info(`skipBlock is disabled.`);
      }
    }

    const fetchFunc = skipBlock
      ? SubstrateUtil.fetchBlocksBatchesLight
      : SubstrateUtil.fetchBlocksBatches;

    if (this.nodeConfig?.profiler) {
      this.fetchBlocksBatches = profilerWrap(
        fetchFunc,
        'SubstrateUtil',
        'fetchBlocksBatches',
      );
    } else {
      this.fetchBlocksBatches = fetchFunc;
    }
  }

  get api(): ApiPromise {
    return this.unsafeApi;
  }

  async getPatchedApi(
    header: Header,
    runtimeVersion: RuntimeVersion,
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

  private redecorateRpcFunction<T extends 'promise' | 'rxjs'>(
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

  private patchApiRpc(api: ApiPromise, apiAt: ApiAt): void {
    apiAt.rpc = Object.entries(api.rpc).reduce((acc, [module, rpcMethods]) => {
      acc[module] = Object.entries(rpcMethods).reduce(
        (accInner, [name, rpcPromiseResult]) => {
          accInner[name] = this.redecorateRpcFunction(
            rpcPromiseResult as RpcMethodResult<any, AnyFunction>,
          );
          return accInner;
        },
        {},
      );
      return acc;
    }, {} as ApiPromise['rpc']);
  }

  private getRPCFunctionName<T extends 'promise' | 'rxjs'>(
    original: RpcMethodResult<T, AnyFunction>,
  ): string {
    const ext = original.meta as unknown as DefinitionRpcExt;

    return `api.rpc.${ext?.section ?? '*'}.${ext?.method ?? '*'}`;
  }

  async fetchBlocks(
    heights: number[],
    overallSpecVer?: number,
    numAttempts = MAX_RECONNECT_ATTEMPTS,
  ): Promise<LightBlockContent[]> {
    let reconnectAttempts = 0;
    while (reconnectAttempts < numAttempts) {
      try {
        const apiInstance = this.connectionPoolService.api;
        return await apiInstance.fetchBlocks(heights, overallSpecVer);
      } catch (e: any) {
        logger.error(
          e,
          `Failed to fetch blocks ${heights[0]}...${
            heights[heights.length - 1]
          }`,
        );

        reconnectAttempts++;
      }
    }
    throw new Error(`Maximum number of retries (${numAttempts}) reached.`);
  }
}
