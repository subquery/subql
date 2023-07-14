// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { isMainThread } from 'worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import { BaseDataSource } from '@subql/common';
import {
  NodeConfig,
  StoreService,
  IndexerSandbox,
  hostStoreToStore,
  ISubqueryProject,
  ApiService,
} from '@subql/node-core';
import { Store } from '@subql/types-ethereum';
import SafeEthProvider from '../ethereum/safe-api';

/* It would be nice to move this to node core but need to find a way to inject other things into the sandbox */
@Injectable()
export class SandboxService {
  private processorCache: Record<string, IndexerSandbox> = {};

  constructor(
    private readonly apiService: ApiService,
    private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') private readonly project: ISubqueryProject,
  ) {}

  getDsProcessor(ds: BaseDataSource, api: SafeEthProvider): IndexerSandbox {
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
    if (this.nodeConfig.unsafe) {
      processor.freeze(this.apiService.api.api, 'unsafeApi');
    }
    processor.freeze(this.project.network.chainId, 'chainId');
    return processor;
  }

  private getDataSourceEntry(ds: BaseDataSource): string {
    return ds.mapping.file;
  }
}
