// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import {
  isDatasourceV0_2_0,
  SubqlEthereumDataSource,
} from '@subql/common-ethereum';
import { NodeConfig, StoreService, IndexerSandbox } from '@subql/node-core';
import { ApiWrapper, EthereumBlockWrapper } from '@subql/types-ethereum';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { getProjectEntry } from '../utils/project';

@Injectable()
export class SandboxService {
  private processorCache: Record<string, IndexerSandbox> = {};

  constructor(
    private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    private readonly project: SubqueryProject,
  ) {}

  getDsProcessorWrapper(
    ds: SubqlProjectDs,
    api: ApiWrapper,
    blockContent: EthereumBlockWrapper,
  ): IndexerSandbox {
    const entry = this.getDataSourceEntry(ds);
    let processor = this.processorCache[entry];
    if (!processor) {
      processor = new IndexerSandbox(
        {
          store: this.storeService.getStore(),
          root: this.project.root,
          script: ds.mapping.entryScript,
          entry,
        },
        this.nodeConfig,
      );
      this.processorCache[entry] = processor;
    }
    api.freezeApi(processor, blockContent);
    return processor;
  }

  private getDataSourceEntry(ds: SubqlEthereumDataSource): string {
    if (isDatasourceV0_2_0(ds)) {
      return ds.mapping.file;
    } else {
      return getProjectEntry(this.project.root);
    }
  }
}
