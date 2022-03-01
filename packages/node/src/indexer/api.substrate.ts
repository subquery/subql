// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise, HttpProvider, WsProvider } from '@polkadot/api';
import { ApiOptions, RpcMethodResult } from '@polkadot/api/types';
import { BlockHash, RuntimeVersion } from '@polkadot/types/interfaces';
import {
  AnyFunction,
  DefinitionRpcExt,
  RegisteredTypes,
} from '@polkadot/types/types';
import { ProjectNetworkConfig } from '@subql/common';
import { profilerWrap } from '../utils/profiler';
import * as SubstrateUtil from '../utils/substrate';
import { getYargsOption } from '../yargs';
import { ApiWrapper } from './api.wrapper';
import { IndexerEvent } from './events';
import { ApiAt, BlockContent } from './types';

const NOT_SUPPORT = (name: string) => () => {
  throw new Error(`${name}() is not supported`);
};

const { argv } = getYargsOption();

const fetchBlocksBatchesUtil = argv.profiler
  ? profilerWrap(
      SubstrateUtil.fetchBlocksBatches,
      'SubstrateUtil',
      'fetchBlocksBatches',
    )
  : SubstrateUtil.fetchBlocksBatches;

export class SubstrateApi implements ApiWrapper {
  private client: ApiPromise;
  private currentBlockHash: string;
  private currentBlockNumber: number;
  private currentRuntimeVersion: RuntimeVersion;
  private options: ApiOptions;

  constructor(
    network: Partial<ProjectNetworkConfig>,
    chainTypes: RegisteredTypes,
    private eventEmitter: EventEmitter2,
  ) {
    let provider: WsProvider | HttpProvider;
    let throwOnConnect = false;

    if (network.endpoint.startsWith('ws')) {
      provider = new WsProvider(network.endpoint);
    } else if (network.endpoint.startsWith('http')) {
      provider = new HttpProvider(network.endpoint);
      throwOnConnect = true;
    }

    this.options = {
      provider,
      throwOnConnect,
      ...chainTypes,
    };

    this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 1 });
    this.client.on('connected', () => {
      this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 1 });
    });
    this.client.on('disconnected', () => {
      this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 0 });
    });
  }

  async init(): Promise<void> {
    this.client = await ApiPromise.create(this.options);
  }

  getGenesisHash(): string {
    return this.client.genesisHash.toString();
  }

  getRuntimeChain(): string {
    return this.client.runtimeChain.toString();
  }

  getSpecName(): string {
    return this.client.runtimeVersion.specName.toString();
  }

  async getFinalizedBlockHeight(): Promise<number> {
    const finalizedBlockHeight = (
      await this.client.rpc.chain.getBlock(
        await this.client.rpc.chain.getFinalizedHead(),
      )
    ).block.header.number.toNumber();
    return finalizedBlockHeight;
  }

  async getLastHeight(): Promise<number> {
    const lastHeight = (
      await this.client.rpc.chain.getHeader()
    ).number.toNumber();
    return lastHeight;
  }

  async fetchBlocksBatches(
    bufferBlocks: number[],
    overallSpecNumber?: number,
  ): Promise<BlockContent[]> {
    const blocksContent = await fetchBlocksBatchesUtil(
      bufferBlocks,
      overallSpecNumber,
    );
    return blocksContent;
  }

  async getPatchedApi(
    blockHash: string | BlockHash,
    blockNumber: number,
    parentBlockHash?: BlockHash,
  ): Promise<ApiAt> {
    this.currentBlockHash = blockHash.toString();
    this.currentBlockNumber = blockNumber;
    if (parentBlockHash) {
      this.currentRuntimeVersion =
        await this.client.rpc.state.getRuntimeVersion(parentBlockHash);
    }
    const apiAt = (await this.client.at(
      blockHash,
      this.currentRuntimeVersion,
    )) as ApiAt;
    this.patchApiRpc(this.client, apiAt);
    return apiAt;
  }

  private patchApiRpc(api: ApiPromise, apiAt: ApiAt): void {
    apiAt.rpc = Object.entries(api.rpc).reduce((acc, [module, rpcMethods]) => {
      acc[module] = Object.entries(rpcMethods).reduce(
        (accInner, [name, rpcPromiseResult]) => {
          accInner[name] = this.redecorateRpcFunction(rpcPromiseResult);
          return accInner;
        },
        {},
      );
      return acc;
    }, {} as ApiPromise['rpc']);
  }

  async getBlockHash(height: number): Promise<BlockHash> {
    const blockHash = await this.client.rpc.chain.getBlockHash(height);
    return blockHash;
  }

  async getRuntimeVersion(blockHash: BlockHash): Promise<RuntimeVersion> {
    const runtimeVersion = await this.client.rpc.state.getRuntimeVersion(
      blockHash,
    );
    return runtimeVersion;
  }

  getClient(): ApiPromise {
    return this.client;
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

        const ret = ((...args: any[]) => {
          const argsClone = [...args];
          argsClone[hashIndex] = isBlockNumber
            ? this.currentBlockNumber
            : this.currentBlockHash;
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

  private getRPCFunctionName<T extends 'promise' | 'rxjs'>(
    original: RpcMethodResult<T, AnyFunction>,
  ): string {
    const ext = original.meta as unknown as DefinitionRpcExt;

    return `api.rpc.${ext?.section ?? '*'}.${ext?.method ?? '*'}`;
  }
}
