// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { RpcMethodResult } from '@polkadot/api/types';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { AnyFunction, DefinitionRpcExt } from '@polkadot/types/types';
import {
  IndexerEvent,
  NetworkMetadataPayload,
  getLogger,
  NodeConfig,
  profilerWrap,
} from '@subql/node-core';
import { SubstrateBlock } from '@subql/types';
import { identity, toNumber } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import * as SubstrateUtil from '../utils/substrate';
import { ApiAt, BlockContent } from './types';
import { HttpProvider } from './x-provider/http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const NOT_SUPPORT = (name: string) => () => {
  throw new Error(`${name}() is not supported`);
};

// https://github.com/polkadot-js/api/blob/12750bc83d8d7f01957896a80a7ba948ba3690b7/packages/rpc-provider/src/ws/index.ts#L43
const RETRY_DELAY = 2_500;
const MAX_RECONNECT_ATTEMPTS = 5;

const logger = getLogger('api');

@Injectable()
export class ApiService implements OnApplicationShutdown {
  private allApi: ApiPromise[] = [];
  private connectionPool: Record<number, ApiPromise> = {};
  private fetchBlocksBatches = SubstrateUtil.fetchBlocksBatches;
  private currentBlockHash: string;
  private currentBlockNumber: number;
  private taskCounter = 0;
  networkMeta: NetworkMetadataPayload;

  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    private eventEmitter: EventEmitter2,
    private nodeConfig: NodeConfig,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      Object.keys(this.connectionPool)?.map((key) =>
        this.connectionPool[key].disconnect(),
      ),
    );
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
    } catch (e) {
      logger.error(e);
      process.exit(1);
    }

    if (this.nodeConfig?.profiler) {
      this.fetchBlocksBatches = profilerWrap(
        SubstrateUtil.fetchBlocksBatches,
        'SubstrateUtil',
        'fetchBlocksBatches',
      );
    }

    let provider: WsProvider | HttpProvider;
    let throwOnConnect = false;

    const headers = {
      'User-Agent': `SubQuery-Node ${packageVersion}`,
    };
    for (let i = 0; i < network.endpoint.length; i++) {
      const endpoint = network.endpoint[i];
      if (endpoint.startsWith('ws')) {
        provider = new WsProvider(endpoint, RETRY_DELAY, headers);
      } else if (endpoint.startsWith('http')) {
        provider = new HttpProvider(endpoint, headers);
        throwOnConnect = true;
      }

      const apiOption = {
        provider,
        throwOnConnect,
        noInitWarn: true,
        ...chainTypes,
      };
      const api = await ApiPromise.create(apiOption);

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
        this.handleApiDisconnects(i, endpoint);
      });

      if (!this.networkMeta) {
        this.networkMeta = {
          chain: api.runtimeChain.toString(),
          specName: api.runtimeVersion.specName.toString(),
          genesisHash: api.genesisHash.toString(),
        };

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
        const chain = api.runtimeChain.toString();
        if (this.networkMeta.chain !== chain) {
          throw this.metadataMismatchError(
            'Runtime Chain',
            this.networkMeta.chain,
            chain,
          );
        }

        const specName = api.runtimeVersion.specName.toString();
        if (this.networkMeta.specName !== specName) {
          throw this.metadataMismatchError(
            'Spec Name',
            this.networkMeta.specName,
            specName,
          );
        }

        const genesisHash = api.genesisHash.toString();
        if (this.networkMeta.genesisHash !== genesisHash) {
          throw this.metadataMismatchError(
            'Genesis Hash',
            this.networkMeta.genesisHash,
            genesisHash,
          );
        }
      }

      logger.info(`Connected to ${endpoint} successfully`);

      this.allApi.push(api);
      this.connectionPool[i] = api;
    }

    return this;
  }

  private async connectToApi(apiIndex: number): Promise<void> {
    await this.allApi[apiIndex].connect();
  }

  get api(): ApiPromise {
    const index = this.getNextConnectedApiIndex();
    if (index === -1) {
      throw new Error('No connected api found');
    }
    return this.connectionPool[this.getNextConnectedApiIndex()];
  }

  async getPatchedApi(
    block: SubstrateBlock,
    runtimeVersion: RuntimeVersion,
  ): Promise<ApiAt> {
    this.currentBlockHash = block.block.hash.toString();
    this.currentBlockNumber = block.block.header.number.toNumber();

    const index = this.getNextConnectedApiIndex();
    const apiAt = (await this.connectionPool[index].at(
      this.currentBlockHash,
      runtimeVersion,
    )) as ApiAt;
    this.patchApiRpc(this.connectionPool[index], apiAt);
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
              const atBlock = await this.connectionPool[
                this.getFirstConnectedApiIndex()
              ].rpc.chain.getBlock(argsClone[hashIndex]);
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

  private async fetchBlocksFromFirstAvailableEndpoint(
    batch: number[],
    overallSpecVer?: number,
  ): Promise<BlockContent[]> {
    let reconnectAttempts = 0;
    while (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      try {
        const index = this.getFirstConnectedApiIndex();
        if (index === -1) {
          throw new Error('No connected api');
        }
        const blocks = await this.fetchBlocksBatches(
          this.api,
          batch,
          overallSpecVer,
        );
        return blocks;
      } catch (e) {
        logger.error(e, 'Failed to fetch blocks');
        reconnectAttempts++;
      }
    }
    throw new Error(
      `Maximum number of retries (${MAX_RECONNECT_ATTEMPTS}) reached.`,
    );
  }

  async fetchBlocks(
    blockNums: number[],
    overallSpecVer?: number,
  ): Promise<BlockContent[]> {
    const api = this.api;
    try {
      const blocks = await this.fetchBlocksBatches(
        api,
        blockNums,
        overallSpecVer,
      );
      return blocks;
    } catch (e) {
      logger.error(
        e,
        `Failed to fetch blocks ${blockNums[0]}...${
          blockNums[blockNums.length - 1]
        }`,
      );
      logger.warn(
        `disconnecting from endpoint and retrying with another endpoint`,
      );
      if (api.isConnected) {
        await api.disconnect();
      }
      const blocks = await this.fetchBlocksFromFirstAvailableEndpoint(
        blockNums,
        overallSpecVer,
      );
      return blocks;
    }
  }

  // functions that can be moved to node-core

  async handleApiDisconnects(
    apiIndex: number,
    endpoint: string,
  ): Promise<void> {
    logger.warn(`disconnected from ${endpoint}`);
    delete this.connectionPool[apiIndex];

    logger.debug(`reconnecting to ${endpoint}...`);
    await this.connectToApi(apiIndex);

    logger.info(`reconnected to ${endpoint}!`);
    this.connectionPool[apiIndex] = this.allApi[apiIndex];
  }

  getNextConnectedApiIndex(): number {
    // get the next connected api index
    if (Object.keys(this.connectionPool).length === 0) {
      return -1;
    }
    const nextIndex =
      this.taskCounter % Object.keys(this.connectionPool).length;
    this.taskCounter++;
    return toNumber(Object.keys(this.connectionPool)[nextIndex]);
  }

  getFirstConnectedApiIndex(): number {
    // get the first connected api index
    if (Object.keys(this.connectionPool).length === 0) {
      return -1;
    }
    return this.connectionPool[Object.keys(this.connectionPool)[0]];
  }

  get numConnections(): number {
    return Object.keys(this.connectionPool).length;
  }
}
