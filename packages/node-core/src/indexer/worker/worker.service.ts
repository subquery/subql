// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {threadId} from 'node:worker_threads';
import {BaseDataSource} from '@subql/types-core';
import {IProjectUpgradeService, NodeConfig} from '../../configure';
import {getLogger} from '../../logger';
import {AutoQueue, isTaskFlushedError, memoryLock} from '../../utils';
import {ProcessBlockResponse} from '../blockDispatcher';
import {IProjectService} from '../types';

export type FetchBlockResponse = {specVersion: number; parentHash: string} | undefined;

export type WorkerStatusResponse = {
  threadId: number;
  isIndexing: boolean;
  fetchedBlocks: number;
  toFetchBlocks: number;
};

const logger = getLogger(`Worker Service #${threadId}`);

export abstract class BaseWorkerService<
  B /* BlockContent */,
  R /* FetchBlockResponse */,
  DS extends BaseDataSource = BaseDataSource,
  E = {} /* Extra params for fetching blocks. Substrate uses specVersion in here*/
> {
  private fetchedBlocks: Record<string, B> = {};
  private _isIndexing = false;

  private queue: AutoQueue<R>;

  protected abstract fetchChainBlock(heights: number, extra: E): Promise<B>;
  protected abstract toBlockResponse(block: B): R;
  protected abstract processFetchedBlock(block: B, dataSources: DS[]): Promise<ProcessBlockResponse>;

  constructor(
    private projectService: IProjectService<DS>,
    private projectUpgradeService: IProjectUpgradeService,
    nodeConfig: NodeConfig
  ) {
    this.queue = new AutoQueue(undefined, nodeConfig.batchSize, nodeConfig.timeout, 'Worker Service');
  }

  async fetchBlock(height: number, extra: E): Promise<R | undefined> {
    try {
      return await this.queue.put(async () => {
        // If a dynamic ds is created we might be asked to fetch blocks again, use existing result
        if (!this.fetchedBlocks[height]) {
          if (memoryLock.isLocked()) {
            const start = Date.now();
            await memoryLock.waitForUnlock();
            const end = Date.now();
            logger.debug(`memory lock wait time: ${end - start}ms`);
          }

          const block = await this.fetchChainBlock(height, extra);
          this.fetchedBlocks[height] = block;
        }

        const block = this.fetchedBlocks[height];
        // Return info to get the runtime version, this lets the worker thread know
        return this.toBlockResponse(block);
      });
    } catch (e: any) {
      if (isTaskFlushedError(e)) {
        return;
      }
      logger.error(e, `Failed to fetch block ${height}`);
    }
  }

  async processBlock(height: number): Promise<ProcessBlockResponse> {
    try {
      this._isIndexing = true;
      const block = this.fetchedBlocks[height];

      if (!block) {
        throw new Error(`Block ${height} has not been fetched`);
      }

      delete this.fetchedBlocks[height];

      // Makes sure the correct project is used for that height
      await this.projectUpgradeService.setCurrentHeight(height);

      return await this.processFetchedBlock(block, await this.projectService.getDataSources(height));
    } catch (e: any) {
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
