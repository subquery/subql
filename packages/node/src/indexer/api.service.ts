// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { performance } from 'perf_hooks';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ApiOptions, RpcMethodResult } from '@polkadot/api/types';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { AnyFunction, DefinitionRpcExt } from '@polkadot/types/types';
import {
  IndexerEvent,
  NetworkMetadataPayload,
  getLogger,
  Queue,
  splitArrayByRatio,
  NodeConfig,
  profilerWrap,
} from '@subql/node-core';
import { SubstrateBlock } from '@subql/types';
import { map, range, toNumber } from 'lodash';
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

export class ApiResponseTimeBuffer extends Queue<number> {
  constructor(capacity: number) {
    super(capacity);
  }

  average() {
    if (this.items.length === 0) {
      return 0;
    }
    return this.items.reduce((a, b) => a + b, 0) / this.items.length;
  }
}

export class ApiLoadBalancer {
  private buffers: Record<number, ApiResponseTimeBuffer> = {};

  constructor(numberOfConnections: number, batchCapacity: number) {
    // fill buffers with ApiResponseTimeBuffer object with capacity of batchCapacity
    range(0, numberOfConnections).forEach((n) => {
      this.buffers[n] = new ApiResponseTimeBuffer(batchCapacity);
    });
    logger.info(`length: ${Object.keys(this.buffers).length}`);
  }

  addToBuffer(connectionIndex: number, responseTime: number) {
    if (
      this.buffers[connectionIndex].size ===
      this.buffers[connectionIndex].capacity
    ) {
      this.buffers[connectionIndex].take();
    }
    this.buffers[connectionIndex].put(responseTime);
  }

  getWeights(disconnectedIndices?: number[]): Record<number, number> {
    const weightsMap: Record<number, number> = {};
    Object.keys(this.buffers).map((key) => {
      if (disconnectedIndices?.includes(toNumber(key))) {
        return;
      }
      weightsMap[key] = this.buffers[key].average();
    });
    if (Object.keys(weightsMap).length === 0) {
      return {};
    }

    const total = Object.values(weightsMap).reduce((a, b) => a + b, 0);
    //deal with the case where average is 0
    if (total === 0) {
      Object.keys(weightsMap).map((key) => {
        weightsMap[key] = 1 / Object.keys(weightsMap).length;
      });
      return weightsMap;
    }
    Object.keys(weightsMap).map((key) => {
      weightsMap[key] = weightsMap[key] / total;
    });
    return weightsMap;
  }
}

@Injectable()
export class ApiService implements OnApplicationShutdown {
  private connectionPool: Record<number, ApiPromise> = {};
  private disconnectedApis: Record<number, ApiPromise> = {};
  private fetchBlocksBatches = SubstrateUtil.fetchBlocksBatches;
  private loadBalancer: ApiLoadBalancer;
  private disconnectedApiIndices: number[] = [];
  private endpoints: string[] = [];
  private currentBlockHash: string;
  private currentBlockNumber: number;
  private apiOptions: ApiOptions[] = [];
  private taskCounter = 0;
  networkMeta: NetworkMetadataPayload;

  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    private eventEmitter: EventEmitter2,
    private nodeConfig: NodeConfig,
  ) {
    if (this.nodeConfig.profiler) {
      this.fetchBlocksBatches = profilerWrap(
        SubstrateUtil.fetchBlocksBatches,
        'SubstrateUtil',
        'fetchBlocksBatches',
      );
    }
  }

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

      this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 1 });
      api.on('connected', () => {
        this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 1 });
        this.connectionPool[i] = api;
        if (this.disconnectedApis[i]) {
          delete this.disconnectApis[i];
        }
      });
      api.on('disconnected', () => {
        this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 0 });
        logger.warn(`Disconnected from ${endpoint}`);
        this.disconnectedApis[i] = api;
        delete this.connectionPool[i];
        this.attemptReconnects();
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

      this.connectionPool[i] = api;
      this.apiOptions.push(apiOption);
      this.endpoints.push(endpoint);
    }

    this.loadBalancer = new ApiLoadBalancer(
      this.numConnections,
      this.nodeConfig.batchSize,
    );

    return this;
  }

  async attemptReconnects(): Promise<void> {
    if (Object.keys(this.disconnectedApis).length === 0) {
      return;
    }
    await Promise.all(
      Object.keys(this.disconnectedApis).map(async (key) => {
        try {
          logger.info(`Attempting to reconnect to ${this.endpoints[key]}`);
          await this.disconnectedApis[key].connect();
          logger.info(`Reconnected to ${this.endpoints[key]}`);
        } catch (e) {
          logger.error(e);
          logger.error(`Failed to reconnect to ${this.endpoints[key]}`);
        }
      }),
    );
  }

  async addToDisconnectedApiIndices(index: number): Promise<void> {
    if (this.disconnectedApiIndices.includes(index)) {
      return;
    }
    await this.connectionPool[index].disconnect();
    this.disconnectedApiIndices.push(index);
  }

  getApi(index?: number): ApiPromise {
    if (!index) {
      index = this.getNextConnectedApiIndex();
    }
    return this.connectionPool[index];
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

  get disconnectApis(): number[] {
    return this.disconnectedApiIndices;
  }

  get numConnections(): number {
    return Object.keys(this.connectionPool).length;
  }

  getEndpoints(index: number): string {
    return this.endpoints[index];
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
        const start = performance.now();
        const index = this.getFirstConnectedApiIndex();
        if (index === -1) {
          throw new Error('No connected api');
        }
        const blocks = await this.fetchBlocksBatches(
          this.getApi(index),
          batch,
          overallSpecVer,
        );
        const end = performance.now();
        this.loadBalancer.addToBuffer(index, (end - start) / batch.length);
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
    if (this.connectionPool[0]) {
      //await this.connectionPool[0].disconnect();
    }
    const weights = this.loadBalancer.getWeights(
      Object.keys(this.disconnectApis).map((key) => toNumber(key)),
    );
    logger.info(`weights: ${JSON.stringify(weights)}`);
    const blocks: BlockContent[] = [];

    //split the blockNums into batches based on the weight as ratio of length of blockNums
    //for example, if blocknums = [1,2,3,4,5,6,7,8,9,10] and weights = [0.5, 0.5], then the batches will be [[1,2,3,4,5], [6,7,8,9,10]]
    const batches = splitArrayByRatio(blockNums, Object.values(weights));

    //fetch blocks from each batch in parallel and record the time it takes to fetch each batch
    //if fetching fails for a batch, add the batch to the end of the queue and try again

    const promises = batches.map(async (batch, index) => {
      try {
        const start = performance.now();
        const blocks = await this.fetchBlocksBatches(
          this.getApi(index),
          batch,
          overallSpecVer,
        );
        const end = performance.now();
        this.loadBalancer.addToBuffer(
          index,
          Math.ceil((end - start) / batch.length),
        );
        return blocks;
      } catch (e) {
        logger.error(
          e,
          `Failed to fetch blocks ${batch[0]}...${batch[batch.length - 1]}`,
        );
        await this.addToDisconnectedApiIndices(index);
        if (index === batches.length - 1) {
          //if it is the last batch, fetch batch from the first available endpoint
          const blocks = await this.fetchBlocksFromFirstAvailableEndpoint(
            batch,
            overallSpecVer,
          );
          return blocks;
        } else {
          //if it is not the last batch, add the batch to the next batch
          batches[index + 1].push(...batch);
        }

        return [];
      }
    });

    const results = await Promise.all(promises);
    results.forEach((result) => {
      blocks.push(...result);
    });

    return blocks;
  }
}
