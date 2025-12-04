// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource} from '@subql/types-core';
import {IProjectUpgradeService, NodeConfig} from '../../configure';
import {getLogger} from '../../logger';
import {monitorWrite} from '../../process';
import {AutoQueue, isTaskFlushedError, RampQueue} from '../../utils';
import {ProcessBlockResponse} from '../blockDispatcher';
import {Header, IBlock, IProjectService} from '../types';
import {isBlockUnavailableError} from './utils';

export type FetchBlockResponse = {specVersion: number; parentHash: string} | undefined;

export type WorkerStatusResponse = {
  threadId: number;
  isIndexing: boolean;
  fetchedBlocks: number;
  toFetchBlocks: number;
};

const logger = getLogger(`WorkerService`);

export abstract class BaseWorkerService<
  B /* BlockContent */,
  R extends Header /* FetchBlockResponse */,
  DS extends BaseDataSource = BaseDataSource,
  E = any /* Extra params for fetching blocks. Substrate uses specVersion in here*/,
> {
  private fetchedBlocks: Record<string, IBlock<B>> = {};
  private _isIndexing = false;

  private queue: AutoQueue<IBlock<B>>;

  protected abstract fetchChainBlock(heights: number, extra: E): Promise<IBlock<B>>;
  protected abstract toBlockResponse(block: IBlock<B>): R;
  protected abstract processFetchedBlock(block: IBlock<B>, dataSources: DS[]): Promise<ProcessBlockResponse>;
  protected abstract getBlockSize(block: IBlock<B>): number;

  constructor(
    private projectService: IProjectService<DS>,
    private projectUpgradeService: IProjectUpgradeService,
    nodeConfig: NodeConfig
  ) {
    this.queue = new RampQueue(
      this.getBlockSize.bind(this),
      nodeConfig.batchSize,
      undefined,
      nodeConfig.timeout,
      'WorkerService'
    );
  }

  async fetchBlock(height: number, extra: E): Promise<R> {
    try {
      const block = await this.queue.put(async () => {
        // If a dynamic ds is created we might be asked to fetch blocks again, use existing result
        if (!this.fetchedBlocks[height]) {
          const block = await this.fetchChainBlock(height, extra);
          this.fetchedBlocks[height] = block;
        }

        return this.fetchedBlocks[height];
      });

      // Return info to get the runtime version, this lets the worker thread know
      return this.toBlockResponse(block);
    } catch (e: any) {
      if (!isTaskFlushedError(e)) {
        logger.error(e, `Failed to fetch block ${height}`);
      }
      throw e;
    }
  }

  async processBlock(height: number): Promise<ProcessBlockResponse> {
    try {
      this._isIndexing = true;
      const block = this.fetchedBlocks[height];

      if (block === undefined) {
        throw new Error(`Block ${height} has not been fetched`);
      }

      delete this.fetchedBlocks[height];

      // Makes sure the correct project is used for that height
      await this.projectUpgradeService.setCurrentHeight(height);

      return await this.processFetchedBlock(block, await this.projectService.getDataSources(height));
    } catch (e: any) {
      if (!isBlockUnavailableError(e)) {
        logger.error(e, `Failed to index block ${height}: ${e.stack}`);
        monitorWrite(`Failed to index block ${height}: ${e.stack}`);
      }
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

  abortFetching(): void {
    return this.queue.abort();
  }
}
