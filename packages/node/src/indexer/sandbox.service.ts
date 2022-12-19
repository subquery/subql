// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { SubqlCosmosDataSource } from '@subql/common-cosmos';
import { NodeConfig, StoreService, IndexerSandbox } from '@subql/node-core';
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
    const entry = this.getDataSourceEntry(ds);
    let processor = this.processorCache[entry];
    if (!processor) {
      processor = new IndexerSandbox(
        {
          // api: await this.apiService.getPatchedApi(),
          store: this.storeService.getStore(),
          root: this.project.root,
          script: ds.mapping.entryScript,
          entry,
        },
        this.nodeConfig,
      );
      this.processorCache[entry] = processor;
    }
    processor.freeze(api, 'api');
    processor.freeze(this.apiService.registry, 'registry');
    if (this.nodeConfig.unsafe) {
      processor.freeze(this.apiService.getApi(), 'unsafeApi');
    }
    return processor;
  }

  private getDataSourceEntry(ds: SubqlCosmosDataSource): string {
    return ds.mapping.file;
  }
}
