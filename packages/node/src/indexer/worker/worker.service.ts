// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { AutoQueue } from '../../utils/autoQueue';
import { fetchBlocksBatches } from '../../utils/substrate';
import { ApiService } from '../api.service';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

export type FetchBlockResponse =
  | { specVersion: number; parentHash: string }
  | undefined;

export type ProcessBlockResponse = {
  dynamicDsCreated: boolean;
};

@Injectable()
export class WorkerService {
  private fetchedBlocks: Record<string, BlockContent> = {};
  private currentRuntimeVersion: RuntimeVersion | undefined;

  private queue: AutoQueue<FetchBlockResponse>;

  constructor(
    private apiService: ApiService,
    private indexerManager: IndexerManager,
  ) {
    this.queue = new AutoQueue(undefined, 5);
  }

  async fetchBlock(height: number): Promise<FetchBlockResponse> {
    return this.queue.put(async () => {
      // If a dynamic ds is created we might be asked to fetch blocks again, use existing result
      if (!this.fetchedBlocks[height]) {
        const [block] = await fetchBlocksBatches(this.apiService.getApi(), [
          height,
        ]);
        this.fetchedBlocks[height] = block;
      }

      const block = this.fetchedBlocks[height];

      // We have the current version, don't need a new one when processing
      if (
        this.currentRuntimeVersion?.specVersion.toNumber() ===
        block.block.specVersion
      ) {
        return;
      }

      // Return info to get the runtime version, this lets the worker thread know
      return {
        specVersion: block.block.specVersion,
        parentHash: block.block.block.header.parentHash.toHex(),
      };
    });
  }

  setCurrentRuntimeVersion(runtimeHex: string): void {
    const runtimeVersion = this.apiService
      .getApi()
      .registry.createType('RuntimeVersion', runtimeHex[0]);

    this.currentRuntimeVersion = runtimeVersion;
  }

  async processBlock(height: number): Promise<ProcessBlockResponse> {
    const block = this.fetchedBlocks[height];

    if (!block) {
      throw new Error(`Block ${height} has not been fetched`);
    }

    delete this.fetchedBlocks[height];

    return this.indexerManager.indexBlock(block, this.currentRuntimeVersion);
  }

  get numFetchedBlocks(): number {
    return Object.keys(this.fetchedBlocks).length;
  }

  get numFetchingBlocks(): number {
    return this.queue.size;
  }
}
