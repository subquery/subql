// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { isMainThread } from 'worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import { SubqlCosmosDataSource } from '@subql/common-cosmos';
import {
  NodeConfig,
  StoreService,
  IndexerSandbox,
  hostStoreToStore,
} from '@subql/node-core';
import { Store } from '@subql/types';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { ApiService, CosmosSafeClient } from './api.service';

@Injectable()
export class SandboxService {
  private processorCache: Record<string, IndexerSandbox> = {};

  constructor(
    private readonly apiService: ApiService,
    private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') private readonly project: SubqueryProject,
  ) {}

  getDsProcessor(ds: SubqlProjectDs, api: CosmosSafeClient): IndexerSandbox {
    const store: Store = isMainThread
      ? this.storeService.getStore()
      : hostStoreToStore((global as any).host); // Provided in worker.ts

    const entry = this.getDataSourceEntry(ds);
    let processor = this.processorCache[entry];
    if (!processor) {
      processor = new IndexerSandbox(
        {
          // api: await this.apiService.getPatchedApi(),
          store,
          root: this.project.root,
          // script: ds.mapping.entryScript,
          entry,
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
    return processor;
  }

  private getDataSourceEntry(ds: SubqlCosmosDataSource): string {
    return ds.mapping.file;
  }
}
