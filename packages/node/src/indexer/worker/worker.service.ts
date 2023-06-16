// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { threadId } from 'node:worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  getLogger,
  AutoQueue,
  memoryLock,
  IProjectService,
  ProcessBlockResponse,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { ApiService } from '../api.service';
import { SpecVersion } from '../dictionary.service';
import { IndexerManager } from '../indexer.manager';
import { WorkerRuntimeService } from '../runtime/workerRuntimeService';
import { BlockContent } from '../types';

export type FetchBlockResponse =
  | { specVersion: number; parentHash: string }
  | undefined;

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
  private _isIndexing = false;

  private queue: AutoQueue<FetchBlockResponse>;

  constructor(
    private apiService: ApiService,
    private indexerManager: IndexerManager,
    private workerRuntimeService: WorkerRuntimeService,
    @Inject('IProjectService')
    private projectService: IProjectService<SubstrateDatasource>,
    nodeConfig: NodeConfig,
  ) {
    this.queue = new AutoQueue(undefined, nodeConfig.batchSize);
  }

  getSpecFromMap(height: number): number | undefined {
    return this.workerRuntimeService.getSpecFromMap(
      height,
      this.workerRuntimeService.specVersionMap,
    );
  }

  async fetchBlock(
    height: number,
    specVersion: number,
  ): Promise<FetchBlockResponse> {
    try {
      return await this.queue.put(async () => {
        // If a dynamic ds is created we might be asked to fetch blocks again, use existing result
        if (!this.fetchedBlocks[height]) {
          const specChanged = await this.workerRuntimeService.specChanged(
            height,
            specVersion,
          );

          if (memoryLock.isLocked()) {
            const start = Date.now();
            await memoryLock.waitForUnlock();
            const end = Date.now();
            logger.debug(`memory lock wait time: ${end - start}ms`);
          }

          const [block] = await this.apiService.fetchBlocks(
            [height],
            specChanged
              ? undefined
              : this.workerRuntimeService.parentSpecVersion,
          );
          this.fetchedBlocks[height] = block;
        }

        const block = this.fetchedBlocks[height];
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

  syncRuntimeService(
    specVersions: SpecVersion[],
    latestFinalizedHeight?: number,
  ): void {
    this.workerRuntimeService.syncSpecVersionMap(
      specVersions,
      latestFinalizedHeight,
    );
  }

  async processBlock(height: number): Promise<ProcessBlockResponse> {
    try {
      this._isIndexing = true;
      const block = this.fetchedBlocks[height];

      if (!block) {
        throw new Error(`Block ${height} has not been fetched`);
      }

      delete this.fetchedBlocks[height];

      const runtimeVersion = await this.workerRuntimeService.getRuntimeVersion(
        block.block,
      );

      return await this.indexerManager.indexBlock(
        block,
        await this.projectService.getDataSources(height),
        runtimeVersion,
      );
    } catch (e) {
      logger.error(e, `Failed to index block ${height}: ${e.stack}`);
      throw e;
    } finally {
      this._isIndexing = false;
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
