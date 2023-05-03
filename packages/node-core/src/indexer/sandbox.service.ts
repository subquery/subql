// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {isMainThread} from 'worker_threads';
import {Inject, Injectable} from '@nestjs/common';
import {BaseDataSource} from '@subql/common';
import {Store} from '@subql/types';
import {ApiService} from '../api.service';
import {NodeConfig} from '../configure';
import {IndexerSandbox} from './sandbox';
import {StoreService} from './store.service';
import {ISubqueryProject} from './types';
import {hostStoreToStore} from './worker';

@Injectable()
export class SandboxService<Api> {
  private processorCache: Record<string, IndexerSandbox> = {};

  constructor(
    private readonly apiService: ApiService,
    private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') private readonly project: ISubqueryProject
  ) {}

  getDsProcessor(ds: BaseDataSource, api: Api): IndexerSandbox {
    const store: Store = isMainThread ? this.storeService.getStore() : hostStoreToStore((global as any).host); // Provided in worker.ts

    const entry = this.getDataSourceEntry(ds);
    let processor = this.processorCache[entry];
    if (!processor) {
      processor = new IndexerSandbox(
        {
          store,
          root: this.project.root,
          entry,
        },
        this.nodeConfig
      );
      this.processorCache[entry] = processor;
    }
    processor.freeze(api, 'api');
    if (this.nodeConfig.unsafe) {
      processor.freeze(this.apiService.api, 'unsafeApi');
    }
    return processor;
  }

  private getDataSourceEntry(ds: BaseDataSource): string {
    return ds.mapping.file;
  }
}
