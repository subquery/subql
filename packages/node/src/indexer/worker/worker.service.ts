// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { threadId } from 'node:worker_threads';
import { Injectable } from '@nestjs/common';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { NodeConfig } from '@subql/node-core/configure';
import { AutoQueue } from '../../utils/autoQueue';
import { getLogger } from '../../utils/logger';
import { fetchBlocksBatches } from '../../utils/substrate';
import { ApiService } from '../api.service';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

export type FetchBlockResponse =
  | { specVersion: number; parentHash: string }
  | undefined;

export type ProcessBlockResponse = {
  dynamicDsCreated: boolean;
  operationHash: string; // Base64 encoded u8a array
};

export type WorkerStatusResponse = {
  threadId: number;
  isIndexing: boolean;
  fetchedBlocks: number;
  toFetchBlocks: number;
};

const logger = getLogger(`Worker Service #${threadId}`);

@Injectable()
export class WorkerService {
  private fetchedBlocks: Record<string, BlockContent> = {};
  private currentRuntimeVersion: RuntimeVersion | undefined;
  private _isIndexing = false;

  private queue: AutoQueue<FetchBlockResponse>;

  constructor(
    private apiService: ApiService,
    private indexerManager: IndexerManager,
    nodeConfig: NodeConfig,
  ) {
    this.queue = new AutoQueue(undefined, nodeConfig.batchSize);
  }

  async fetchBlock(height: number): Promise<FetchBlockResponse> {
    try {
      return await this.queue.put(async () => {
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
    } catch (e) {
      logger.error(e, `Failed to fetch block ${height}`);
    }
  }

  setCurrentRuntimeVersion(runtimeHex: string): void {
    const runtimeVersion = this.apiService
      .getApi()
      .registry.createType('RuntimeVersion', runtimeHex[0]);

    this.currentRuntimeVersion = runtimeVersion;
  }

  async processBlock(height: number): Promise<ProcessBlockResponse> {
    try {
      this._isIndexing = true;
      const block = this.fetchedBlocks[height];

      if (!block) {
        throw new Error(`Block ${height} has not been fetched`);
      }

      delete this.fetchedBlocks[height];

      const response = await this.indexerManager.indexBlock(
        block,
        this.currentRuntimeVersion,
      );

      this._isIndexing = false;
      return {
        ...response,
        operationHash: Buffer.from(response.operationHash).toString('base64'),
      };
    } catch (e) {
      logger.error(e, `Failed to index block ${height}: ${e.stack}`);
      throw e;
    }
  }

  get numFetchedBlocks(): number {
    return Object.keys(this.fetchedBlocks).length;
  }

  get numFetchingBlocks(): number {
    return this.queue.size;
  }

  get isIndexing(): boolean {
    return this._isIndexing;
  }
}
