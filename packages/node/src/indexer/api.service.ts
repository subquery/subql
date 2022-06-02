// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise, HttpProvider, WsProvider } from '@polkadot/api';
import { ApiOptions, RpcMethodResult } from '@polkadot/api/types';
import { BlockHash, RuntimeVersion } from '@polkadot/types/interfaces';
import { AnyFunction, DefinitionRpcExt } from '@polkadot/types/types';
import { SubstrateBlock } from '@subql/types';
import { SubqueryProject } from '../configure/SubqueryProject';
import { getLogger } from '../utils/logger';
import { IndexerEvent, NetworkMetadataPayload } from './events';
import { ApiAt } from './types';

const NOT_SUPPORT = (name: string) => () => {
  throw new Error(`${name}() is not supported`);
};

const logger = getLogger('api');

@Injectable()
export class ApiService implements OnApplicationShutdown {
  private api: ApiPromise;
  private currentBlockHash: string;
  private currentBlockNumber: number;
  private currentRuntimeVersion: RuntimeVersion;
  private apiOption: ApiOptions;
  networkMeta: NetworkMetadataPayload;

  constructor(
    protected project: SubqueryProject,
    private eventEmitter: EventEmitter2,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.api?.disconnect()]);
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
    if (network.endpoint.startsWith('ws')) {
      provider = new WsProvider(network.endpoint);
    } else if (network.endpoint.startsWith('http')) {
      provider = new HttpProvider(network.endpoint);
      throwOnConnect = true;
    }

    this.apiOption = {
      provider,
      throwOnConnect,
      ...chainTypes,
    };
    this.api = await ApiPromise.create(this.apiOption);

    this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 1 });
    this.api.on('connected', () => {
      this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 1 });
    });
    this.api.on('disconnected', () => {
      this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 0 });
    });

    this.networkMeta = {
      chain: this.api.runtimeChain.toString(),
      specName: this.api.runtimeVersion.specName.toString(),
      genesisHash: this.api.genesisHash.toString(),
    };

    if (network.chainId && network.chainId !== this.networkMeta.genesisHash) {
      const err = new Error(
        `Network chainId doesn't match expected genesisHash. expected="${
          network.chainId ?? network.genesisHash
        }" actual="${this.networkMeta.genesisHash}`,
      );
      logger.error(err, err.message);
      throw err;
    }

    return this;
  }

  getApi(): ApiPromise {
    return this.api;
  }

  async getPatchedApi(
    block: SubstrateBlock,
    runtimeVersion: RuntimeVersion,
  ): Promise<ApiAt> {
    this.currentBlockHash = block.block.hash.toString();
    this.currentBlockNumber = block.block.header.number.toNumber();

    const apiAt = (await this.api.at(
      this.currentBlockHash,
      runtimeVersion,
    )) as ApiAt;
    this.patchApiRpc(this.api, apiAt);
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

  private getRPCFunctionName<T extends 'promise' | 'rxjs'>(
    original: RpcMethodResult<T, AnyFunction>,
  ): string {
    const ext = original.meta as unknown as DefinitionRpcExt;

    return `api.rpc.${ext?.section ?? '*'}.${ext?.method ?? '*'}`;
  }
}
