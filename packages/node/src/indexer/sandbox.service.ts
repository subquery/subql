// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  isDatasourceV0_2_0,
  SubstrateDataSource,
} from '@subql/common-substrate';
import { NodeConfig, StoreService, IndexerSandbox } from '@subql/node-core';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { getProjectEntry } from '../utils/project';
import { ApiService } from './api.service';
import { ApiAt } from './types';

@Injectable()
export class SandboxService {
  private processorCache: Record<string, IndexerSandbox> = {};

  constructor(
    private readonly apiService: ApiService,
    private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') private readonly project: SubqueryProject,
  ) {}

  getDsProcessor(ds: SubqlProjectDs, api: ApiAt): IndexerSandbox {
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
    if (this.nodeConfig.unsafe) {
      processor.freeze(this.apiService.api, 'unsafeApi');
    }
    return processor;
  }

  private getDataSourceEntry(ds: SubstrateDataSource): string {
    if (isDatasourceV0_2_0(ds)) {
      return ds.mapping.file;
    } else {
      return getProjectEntry(this.project.root);
    }
  }
}
