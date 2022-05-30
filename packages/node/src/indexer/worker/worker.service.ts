// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { fetchBlocksBatches } from '../../utils/substrate';
import { ApiService } from '../api.service';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

@Injectable()
export class WorkerService {
  private fetchedBlocks: Record<string, BlockContent> = {};
  private fetchingBlocks: Record<string, Promise<any>> = {};

  constructor(
    private apiService: ApiService,
    private indexerManager: IndexerManager,
  ) {}

  async fetchBlock(height: number): Promise<void> {
    return (this.fetchingBlocks[height] = fetchBlocksBatches(
      this.apiService.getApi(),
      [height],
    ).then(([block]) => {
      this.fetchedBlocks[height] = block;
      delete this.fetchingBlocks[height];
    }));
  }

  async processBlock(height: number): Promise<void> {
    const block = this.fetchedBlocks[height];

    if (!block) {
      throw new Error(`Block ${height} has not been fetched`);
    }

    delete this.fetchedBlocks[height];

    return this.indexerManager.indexBlock(block, null /* TODO */);
  }

  get numFetchedBlocks(): number {
    return Object.keys(this.fetchedBlocks).length;
  }

  get numFetchingBlocks(): number {
    return Object.keys(this.fetchingBlocks).length;
  }
}
