// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'worker_threads';
import {Inject, Injectable} from '@nestjs/common';
import {BaseDataSource, Store} from '@subql/types-core';
import {NodeConfig} from '../configure';
import {loadProjectEnvConfig, createSandboxProcessEnv} from '../utils/env';
import {InMemoryCacheService} from './inMemoryCache.service';
import {IndexerSandbox} from './sandbox';
import {StoreService} from './store.service';
import {ISubqueryProject} from './types';
import {hostStoreToStore} from './worker';

/* It would be nice to move this to node core but need to find a way to inject other things into the sandbox */
@Injectable()
export class SandboxService<Api, UnsafeApi> {
  private processorCache: Record<string, IndexerSandbox> = {};
  private envConfig: Record<string, string> = {};

  constructor(
    @Inject(isMainThread ? StoreService : 'Null')
    private readonly storeService: StoreService,
    private readonly cacheService: InMemoryCacheService,
    private readonly nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') private readonly project: ISubqueryProject
  ) {
    // Load environment variables from .env file
    const projectEnvConfig = loadProjectEnvConfig(this.project.root);
    this.envConfig = createSandboxProcessEnv(projectEnvConfig);
  }

  getDsProcessor(
    ds: BaseDataSource,
    api: Api,
    unsafeApi: UnsafeApi,
    extraInjections: Record<string, any> = {}
  ): IndexerSandbox {
    const store: Store = isMainThread ? this.storeService.getStore() : hostStoreToStore((global as any).host); // Provided in worker.ts

    const cache = this.cacheService.getCache();
    const entry = this.getDataSourceEntry(ds);
    let processor = this.processorCache[entry];
    if (!processor) {
      processor = new IndexerSandbox(
        {
          cache,
          store,
          root: this.project.root,
          entry,
          chainId: this.project.network.chainId,
          envConfig: this.envConfig,
        },
        this.nodeConfig
      );
      this.processorCache[entry] = processor;
    }
    // Run this before injecting other values so they cannot be overwritten
    for (const [key, value] of Object.entries(extraInjections)) {
      processor.freeze(value, key);
    }
    processor.freeze(api, 'api');
    if (this.nodeConfig.unsafe) {
      processor.freeze(unsafeApi, 'unsafeApi');
    }
    processor.freeze(this.project.network.chainId, 'chainId');
    return processor;
  }

  private getDataSourceEntry(ds: BaseDataSource): string {
    return ds.mapping.file;
  }
}
