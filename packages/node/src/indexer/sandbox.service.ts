// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { isMainThread } from 'worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  StoreService,
  IndexerSandbox,
  hostStoreToStore,
  ISubqueryProject,
} from '@subql/node-core';
import { Store, BaseDataSource } from '@subql/types-core';
import { ApiService, CosmosSafeClient } from './api.service';

/* It would be nice to move this to node core but need to find a way to inject other things into the sandbox */
@Injectable()
export class SandboxService<Api extends CosmosSafeClient> {
  private processorCache: Record<string, IndexerSandbox> = {};

  constructor(
    private readonly apiService: ApiService,
    @Inject(isMainThread ? StoreService : 'Null')
    private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') private readonly project: ISubqueryProject,
  ) {}

  getDsProcessor(ds: BaseDataSource, api: Api): IndexerSandbox {
    const store: Store = isMainThread
      ? this.storeService.getStore()
      : hostStoreToStore((global as any).host); // Provided in worker.ts

    const entry = this.getDataSourceEntry(ds);
    let processor = this.processorCache[entry];
    if (!processor) {
      processor = new IndexerSandbox(
        {
          store,
          root: this.project.root,
          entry,
          chainId: this.project.network.chainId,
        },
        this.nodeConfig,
      );
      this.processorCache[entry] = processor;
    }
    processor.freeze(api, 'api');
    processor.freeze(this.apiService.registry, 'registry');
    if (this.nodeConfig.unsafe) {
      processor.freeze(this.apiService.api, 'unsafeApi');
    }
    processor.freeze(this.project.network.chainId, 'chainId');
    return processor;
  }

  private getDataSourceEntry(ds: BaseDataSource): string {
    return ds.mapping.file;
  }
}
