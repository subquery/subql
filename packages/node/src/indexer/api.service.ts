// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise, HttpProvider, WsProvider } from '@polkadot/api';
import {
  ApiInterfaceRx,
  ApiOptions,
  DecoratedRpc,
  QueryableStorageEntry,
  QueryableStorageMultiArg,
  RpcMethodResult,
} from '@polkadot/api/types';
import { RpcInterface } from '@polkadot/rpc-core/types';
import { StorageKey } from '@polkadot/types';
import { BlockHash } from '@polkadot/types/interfaces';
import { AnyFunction, AnyTuple, Registry } from '@polkadot/types/types';
import { combineLatest } from 'rxjs';
import { SubqueryProject } from '../configure/project.model';
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

    this.eventEmitter.emit(IndexerEvent.NetworkMetadata, this.networkMeta);
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

  async getPatchedApi(): Promise<ApiPromise> {
    if (this.patchedApi) {
      return this.patchedApi;
    }

    // TODO: remove once https://github.com/polkadot-js/api/pull/3949 is merged and released
    const {
      network: { endpoint },
    } = this.project;
    const patchedApi = endpoint.startsWith('ws')
      ? this.getApi().clone()
      : new ApiPromise(this.apiOption);
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

  private patchApi(registry?: Registry): void {
    if (registry) {
      Object.defineProperty(this.patchedApi, 'registry', {
        value: registry,
        writable: false,
        configurable: true,
      });
    }
    this.patchApiAt(this.patchedApi);
    this.patchApiQuery(this.patchedApi);
    this.patchApiTx(this.patchedApi);
    this.patchApiQueryMulti(this.patchedApi);
    this.patchDerive(this.patchedApi);
    this.patchApiRpc(this.patchedApi);
    (this.patchedApi as any).isPatched = true;
  }

  async setBlockhash(blockHash: BlockHash, inject = false): Promise<void> {
    if (!this.patchedApi) {
      await this.getPatchedApi();
    }
    this.currentBlockHash = blockHash;
    if (inject) {
      const { metadata, registry } = await this.api.getBlockRegistry(blockHash);
      this.patchedApi.injectMetadata(metadata, true, registry);
      this.patchApi(registry);
    }
  }

  private replaceToAtVersion(
    original: QueryableStorageEntry<'promise' | 'rxjs', AnyTuple>,
    atMethod: string,
  ) {
    return (...args: any[]) => {
      return original[atMethod](this.currentBlockHash, ...args);
    };
  }

  private redecorateStorageEntryFunction(
    original: QueryableStorageEntry<'promise' | 'rxjs', AnyTuple>,
    apiType: 'promise' | 'rxjs',
  ): QueryableStorageEntry<'promise' | 'rxjs', AnyTuple> {
    const newEntryFunc = this.replaceToAtVersion(
      original,
      'at',
    ) as QueryableStorageEntry<'promise' | 'rxjs', AnyTuple>;
    newEntryFunc.at = NOT_SUPPORT('at');
    newEntryFunc.creator = original.creator;
    newEntryFunc.entries = this.replaceToAtVersion(original, 'entriesAt');
    newEntryFunc.entriesAt = NOT_SUPPORT('entriesAt');
    newEntryFunc.entriesPaged = NOT_SUPPORT('entriesPaged');
    newEntryFunc.hash = NOT_SUPPORT('hash');
    newEntryFunc.is = original.is.bind(original);
    newEntryFunc.key = original.key.bind(original);
    newEntryFunc.keyPrefix = original.keyPrefix.bind(original);
    newEntryFunc.keys = this.replaceToAtVersion(original, 'keysAt');
    newEntryFunc.keysAt = NOT_SUPPORT('keysAt');
    newEntryFunc.keysPaged = NOT_SUPPORT('keysPaged');
    if (apiType === 'promise') {
      this.patchPromiseStorageEntryMulti(
        newEntryFunc as QueryableStorageEntry<'promise', AnyTuple>,
      );
    } else {
      this.patchRxStorageEntryMulti(
        newEntryFunc as QueryableStorageEntry<'rxjs', AnyTuple>,
      );
    }
    newEntryFunc.multi = ((args: any[]) => {
      const keys = args.map((arg) => {
        const key = new StorageKey(
          this.api.registry,
          original.key(
            ...(original.creator.meta.type.isDoubleMap ? arg : [arg]),
          ),
        );
        key.setMeta(original.creator.meta);
        return key;
      });
      if (apiType === 'promise') {
        return this.api.rpc.state.queryStorageAt(keys, this.currentBlockHash);
      } else {
        return this.api.rx.rpc.state.queryStorageAt(
          keys,
          this.currentBlockHash,
        );
      }
    }) as any;
    newEntryFunc.range = NOT_SUPPORT('range');
    newEntryFunc.size = this.replaceToAtVersion(original, 'sizeAt');
    newEntryFunc.sizeAt = NOT_SUPPORT('sizeAt');
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

  private patchPromiseStorageEntryMulti(
    newEntryFunc: QueryableStorageEntry<'promise', AnyTuple>,
  ): void {
    newEntryFunc.multi = (async (keys: any[]) =>
      Promise.all(keys.map(async (key) => newEntryFunc(key)))) as any;
  }

  private patchRxStorageEntryMulti(
    newEntryFunc: QueryableStorageEntry<'rxjs', AnyTuple>,
  ): void {
    newEntryFunc.multi = ((keys: any[]) =>
      combineLatest(keys.map((key) => newEntryFunc(key)))) as any;
  }

  private patchApiQuery(api: ApiPromise): void {
    (api as any)._query = Object.entries(api.query).reduce(
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

  private getKeysFromCalls(
    api: ApiPromise,
    calls: QueryableStorageMultiArg<'promise' | 'rxjs'>[],
  ): StorageKey[] {
    return calls.map((callMultiArg) => {
      if (callMultiArg instanceof Array) {
        const [storageFunc, ...args] = callMultiArg;
        const key = new StorageKey(api.registry, storageFunc.key(...args));
        key.setMeta(storageFunc.creator.meta);
        return key;
      } else {
        const key = new StorageKey(api.registry, callMultiArg.key());
        key.setMeta(callMultiArg.creator.meta);
        return key;
      }
    });
  }

  private patchApiQueryMulti(api: ApiPromise): void {
    (api as any)._queryMulti = (
      calls: QueryableStorageMultiArg<'promise'>[],
    ) => {
      const keys = this.getKeysFromCalls(api, calls);
      return this.api.rpc.state.queryStorageAt(keys, this.currentBlockHash);
    };
    (api as any)._rx.queryMulti = (
      calls: QueryableStorageMultiArg<'rxjs'>[],
    ) => {
      const keys = this.getKeysFromCalls(api, calls);
      return this.api.rx.rpc.state.queryStorageAt(keys, this.currentBlockHash);
    };
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
