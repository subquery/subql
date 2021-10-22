// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise, HttpProvider, WsProvider } from '@polkadot/api';
import {
  ApiDecoration,
  ApiInterfaceRx,
  ApiOptions,
  DecoratedRpc,
  QueryableStorageEntry,
  RpcMethodResult,
} from '@polkadot/api/types';
import { RpcInterface } from '@polkadot/rpc-core/types';
import { BlockHash } from '@polkadot/types/interfaces';
import { StorageEntry } from '@polkadot/types/primitive/types';
import { AnyFunction, AnyTuple } from '@polkadot/types/types';
import { SubqueryProject } from '../configure/project.model';
import { delay } from '../utils/promise';
import { IndexerEvent, NetworkMetadataPayload } from './events';

const NOT_SUPPORT = (name: string) => () => {
  throw new Error(`${name}() is not supported`);
};

@Injectable()
export class ApiService implements OnApplicationShutdown {
  private api: ApiPromise;
  private patchedApi: ApiPromise;
  private currentBlockHash: BlockHash;
  private apiOption: ApiOptions;
  networkMeta: NetworkMetadataPayload;

  constructor(
    protected project: SubqueryProject,
    private eventEmitter: EventEmitter2,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.api?.disconnect(), this.patchedApi?.disconnect()]);
  }

  async init(): Promise<ApiService> {
    const { chainTypes, network } = this.project;
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
    this.networkMeta = {
      chain: this.api.runtimeChain.toString(),
      specName: this.api.runtimeVersion.specName.toString(),
      genesisHash: this.api.genesisHash.toString(),
      blockTime:
        this.api.consts.babe?.expectedBlockTime.toNumber() ||
        this.api.consts.timestamp?.minimumPeriod.muln(2).toNumber() ||
        6000,
    };

    this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 1 });
    this.api.on('connected', () => {
      this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 1 });
    });
    this.api.on('disconnected', () => {
      this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 0 });
    });

    if (
      network.genesisHash &&
      network.genesisHash !== this.networkMeta.genesisHash
    ) {
      throw new Error(
        `Network genesisHash doesn't match expected genesisHash. expected="${network.genesisHash}" actual="${this.networkMeta.genesisHash}`,
      );
    }

    return this;
  }

  getApi(): ApiPromise {
    return this.api;
  }

  emitNetworkEvent(): void {
    this.eventEmitter.emit(IndexerEvent.NetworkMetadata, this.networkMeta);
  }

  async getPatchedApi(): Promise<ApiPromise> {
    if (this.patchedApi) {
      return this.patchedApi;
    }
    const patchedApi = this.getApi().clone();
    Object.defineProperty(
      (patchedApi as any)._rpcCore.provider,
      'hasSubscriptions',
      { value: false },
    );
    patchedApi.on('connected', () =>
      this.eventEmitter.emit(IndexerEvent.InjectedApiConnected, {
        value: 1,
      }),
    );
    patchedApi.on('disconnected', () =>
      this.eventEmitter.emit(IndexerEvent.InjectedApiConnected, {
        value: 0,
      }),
    );
    await patchedApi.isReady;
    this.eventEmitter.emit(IndexerEvent.InjectedApiConnected, {
      value: 1,
    });
    this.patchedApi = patchedApi;
    this.patchApi();
    return this.patchedApi;
  }

  private patchApi(): void {
    this.patchApiAt(this.patchedApi);
    this.patchApiTx(this.patchedApi);
    this.patchDerive(this.patchedApi);
    this.patchApiRpc(this.patchedApi);
    (this.patchedApi as any).isPatched = true;
  }

  async setBlockhash(blockHash: BlockHash): Promise<void> {
    if (!this.patchedApi) {
      await this.getPatchedApi();
    }
    this.currentBlockHash = blockHash;
    const apiAt = await this.api.at(blockHash);
    this.patchApiQuery(this.patchedApi, apiAt);
    this.patchApiFind(this.patchedApi, apiAt);
    this.patchApiQueryMulti(this.patchedApi, apiAt);
  }

  private redecorateStorageEntryFunction(
    original: QueryableStorageEntry<'promise' | 'rxjs', AnyTuple>,
    apiType: 'promise' | 'rxjs',
  ): QueryableStorageEntry<'promise' | 'rxjs', AnyTuple> {
    const newEntryFunc = original;
    newEntryFunc.at = NOT_SUPPORT('at');
    newEntryFunc.entriesAt = NOT_SUPPORT('entriesAt');
    newEntryFunc.entriesPaged = NOT_SUPPORT('entriesPaged');
    newEntryFunc.hash = NOT_SUPPORT('hash');
    newEntryFunc.keysAt = NOT_SUPPORT('keysAt');
    newEntryFunc.keysPaged = NOT_SUPPORT('keysPaged');
    newEntryFunc.range = NOT_SUPPORT('range');
    newEntryFunc.sizeAt = NOT_SUPPORT('sizeAt');
    newEntryFunc.multi = ((args: unknown[]) => {
      let keys: [StorageEntry, unknown[]][];
      const creator = original.creator;
      if (creator.meta.type.asMap.hashers.length === 1) {
        keys = args.map((a) => [creator, [a]]);
      } else {
        keys = args.map((a) => [creator, a as unknown[]]);
      }
      if (apiType === 'promise') {
        return this.api.rpc.state.queryStorageAt(keys, this.currentBlockHash);
      } else {
        return this.api.rx.rpc.state.queryStorageAt(
          keys,
          this.currentBlockHash,
        );
      }
    }) as any;

    return newEntryFunc;
  }

  private redecorateRpcFunction<T extends 'promise' | 'rxjs'>(
    original: RpcMethodResult<T, AnyFunction>,
    apiType: T,
  ): RpcMethodResult<T, AnyFunction> {
    if (original.meta.params) {
      const hashIndex = original.meta.params.findIndex(
        ({ isHistoric, name }) => isHistoric,
      );
      if (hashIndex > -1) {
        const ret = ((...args: any[]) => {
          const argsClone = [...args];
          argsClone[hashIndex] = this.currentBlockHash;
          return original(...argsClone);
        }) as RpcMethodResult<T, AnyFunction>;
        ret.json = NOT_SUPPORT('api.rpc.*.*.json');
        ret.raw = NOT_SUPPORT('api.rpc.*.*.raw');
        ret.meta = original.meta;
        return ret;
      }
    }
    const ret = NOT_SUPPORT('api.rpc.*.*') as unknown as RpcMethodResult<
      T,
      AnyFunction
    >;
    ret.json = NOT_SUPPORT('api.rpc.*.*.json');
    ret.raw = NOT_SUPPORT('api.rpc.*.*.raw');
    ret.meta = original.meta;
    return ret;
  }

  private patchApiFind(
    api: ApiPromise,
    apiAt: ApiDecoration<'promise' | 'rxjs'>,
  ): void {
    api.findCall = apiAt.findCall;
    api.findError = apiAt.findError;
  }

  private patchApiQuery(
    api: ApiPromise,
    apiAt: ApiDecoration<'promise' | 'rxjs'>,
  ): void {
    (api as any)._query = Object.entries(apiAt.query).reduce(
      (acc, [module, moduleStorageItems]) => {
        acc[module] = Object.entries(moduleStorageItems).reduce(
          (accInner, [storageName, storageEntry]) => {
            accInner[storageName] = this.redecorateStorageEntryFunction(
              storageEntry,
              'promise',
            );
            return accInner;
          },
          {},
        );
        return acc;
      },
      {},
    );
    (api as any)._rx.query = Object.entries(
      (api as any)._rx.query as ApiInterfaceRx['query'],
    ).reduce((acc, [module, moduleStorageItems]) => {
      acc[module] = Object.entries(moduleStorageItems).reduce(
        (accInner, [storageName, storageEntry]) => {
          accInner[storageName] = this.redecorateStorageEntryFunction(
            storageEntry,
            'rxjs',
          );
          return accInner;
        },
        {},
      );
      return acc;
    }, {});
  }

  private patchApiTx(api: ApiPromise): void {
    (api as any)._extrinsics = Object.entries(api.tx).reduce(
      (acc, [module, moduleExtrinsics]) => {
        acc[module] = Object.entries(moduleExtrinsics).reduce(
          (accInner, [name]) => {
            accInner[name] = NOT_SUPPORT('api.tx.*');
            return accInner;
          },
          {},
        );
        return acc;
      },
      {},
    );
    (api as any)._rx.tx = Object.entries(
      (api as any)._rx.tx as ApiInterfaceRx['tx'],
    ).reduce((acc, [module, moduleExtrinsics]) => {
      acc[module] = Object.entries(moduleExtrinsics).reduce(
        (accInner, [name]) => {
          accInner[name] = NOT_SUPPORT('api.tx.*');
          return accInner;
        },
        {},
      );
      return acc;
    }, {});
  }

  private patchApiRpc(api: ApiPromise): void {
    (api as any)._rpc = Object.entries(
      api.rpc as DecoratedRpc<'promise', RpcInterface>,
    ).reduce((acc, [module, rpcMethods]) => {
      acc[module] = Object.entries(rpcMethods).reduce(
        (accInner, [name, rpcPromiseResult]) => {
          accInner[name] = this.redecorateRpcFunction(
            rpcPromiseResult,
            'promise',
          );
          return accInner;
        },
        {},
      );
      return acc;
    }, {});
    (api as any)._rx.rpc = Object.entries(
      (api as any)._rx.rpc as ApiInterfaceRx['rpc'],
    ).reduce((acc, [module, rpcMethods]) => {
      acc[module] = Object.entries(rpcMethods).reduce(
        (accInner, [name, rpcRxResult]) => {
          accInner[name] = this.redecorateRpcFunction(rpcRxResult, 'rxjs');
          return accInner;
        },
        {},
      );
      return acc;
    }, {});
  }
  private patchApiQueryMulti(
    api: ApiPromise,
    apiAt: ApiDecoration<'promise' | 'rxjs'>,
  ): void {
    (api as any)._queryMulti = apiAt.queryMulti;
    (api as any).rx.queryMulti = NOT_SUPPORT('api.rx.queryMulti');
  }

  private patchDerive(api: ApiPromise): void {
    (api as any)._derive = Object.entries((api as any).derive).reduce(
      (acc, [module, deriveMethods]) => {
        acc[module] = Object.entries(deriveMethods).reduce(
          (accInner, [name]) => {
            accInner[name] = NOT_SUPPORT('api.derive.*');
            return accInner;
          },
          {},
        );
        return acc;
      },
      {},
    );
    (api as any)._rx.derive = Object.entries((api as any)._rx.derive).reduce(
      (acc, [module, deriveMethods]) => {
        acc[module] = Object.entries(deriveMethods).reduce(
          (accInner, [name]) => {
            accInner[name] = NOT_SUPPORT('api.derive.*');
            return accInner;
          },
          {},
        );
        return acc;
      },
      {},
    );
  }

  private patchApiAt(api: ApiPromise): void {
    (api as any).at = NOT_SUPPORT('api.at()');
  }
}
