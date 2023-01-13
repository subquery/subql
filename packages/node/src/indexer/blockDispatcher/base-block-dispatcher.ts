// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { hexToU8a, u8aEq } from '@polkadot/util';
import { getLogger, IndexerEvent, IQueue, NodeConfig } from '@subql/node-core';
import { ProjectService } from '../project.service';

const logger = getLogger('BaseBlockDispatcherService');

export type ProcessBlockResponse = {
  dynamicDsCreated: boolean;
  operationHash: Uint8Array;
  reindexBlockHeight: number;
};

export interface IBlockDispatcher {
  init(onDynamicDsCreated: (height: number) => Promise<void>): Promise<void>;

  enqueueBlocks(heights: number[], latestBufferHeight?: number): void;

  queueSize: number;
  freeSize: number;
  latestBufferedHeight: number | undefined;

  // Remove all enqueued blocks, used when a dynamic ds is created
  flushQueue(height: number): void;
  rewind(height: number): Promise<void>;
}

const NULL_MERKEL_ROOT = hexToU8a('0x00');

function isNullMerkelRoot(operationHash: Uint8Array): boolean {
  return u8aEq(operationHash, NULL_MERKEL_ROOT);
}

export abstract class BaseBlockDispatcher<Q extends IQueue>
  implements IBlockDispatcher
{
  protected _latestBufferedHeight: number;
  protected _processedBlockCount: number;
  protected latestProcessedHeight: number;
  protected currentProcessingHeight: number;
  protected onDynamicDsCreated: (height: number) => Promise<void>;

  constructor(
    protected nodeConfig: NodeConfig,
    protected eventEmitter: EventEmitter2,
    protected projectService: ProjectService,
    protected queue: Q,
  ) {}

  abstract enqueueBlocks(heights: number[]): void;
  abstract init(
    onDynamicDsCreated: (height: number) => Promise<void>,
  ): Promise<void>;

  get queueSize(): number {
    return this.queue.size;
  }

  get freeSize(): number {
    return this.queue.freeSpace;
  }

  get latestBufferedHeight(): number {
    return this._latestBufferedHeight;
  }

  set latestBufferedHeight(height: number) {
    this.eventEmitter.emit(IndexerEvent.BlocknumberQueueSize, {
      value: this.queueSize,
    });
    this._latestBufferedHeight = height;
  }

  protected setProcessedBlockCount(processedBlockCount: number): void {
    this._processedBlockCount = processedBlockCount;
    this.eventEmitter.emit(IndexerEvent.BlockProcessedCount, {
      processedBlockCount,
      timestamp: Date.now(),
    });
  }

  //  Compare it with current indexing number, if last corrected is already indexed
  //  rewind, also flush queued blocks, drop current indexing transaction, set last processed to correct block too
  //  if rollback is greater than current index flush queue only
  async rewind(lastCorrectHeight: number): Promise<void> {
    if (lastCorrectHeight <= this.currentProcessingHeight) {
      logger.info(
        `Found last verified block at height ${lastCorrectHeight}, rewinding...`,
      );
      await this.projectService.reindex(lastCorrectHeight);
      this.latestProcessedHeight = lastCorrectHeight;
      logger.info(`Successful rewind to block ${lastCorrectHeight}!`);
    }
    this.flushQueue(lastCorrectHeight);
    logger.info(`Queued blocks flushed!`); //Also last buffered height reset, next fetching should start after lastCorrectHeight
  }

  flushQueue(height: number): void {
    this.latestBufferedHeight = height;
    this.queue.flush();
  }

  // Is called directly before a block is processed
  protected preProcessBlock(height: number): void {
    this.currentProcessingHeight = height;
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height,
      timestamp: Date.now(),
    });
  }

  // Is called directly after a block is processed
  protected async postProcessBlock(
    height: number,
    processBlockResponse: ProcessBlockResponse,
  ): Promise<void> {
    const { dynamicDsCreated, operationHash, reindexBlockHeight } =
      processBlockResponse;
    if (reindexBlockHeight !== null && reindexBlockHeight !== undefined) {
      await this.rewind(reindexBlockHeight);
      this.latestProcessedHeight = reindexBlockHeight;
    } else {
      if (this.nodeConfig.proofOfIndex && !isNullMerkelRoot(operationHash)) {
        // We only check if it is undefined, need to be caution here when blockOffset is 0
        if (this.projectService.blockOffset === undefined) {
          // Which means during project init, it has not found offset and set value
          await this.projectService.upsertMetadataBlockOffset(height - 1);
        }
        // this will return if project service blockOffset already exist
        void this.projectService.setBlockOffset(height - 1);
      }
      if (dynamicDsCreated) {
        await this.onDynamicDsCreated(height);
      }
      assert(
        !this.latestProcessedHeight || height > this.latestProcessedHeight,
        `Block processed out of order. Height: ${height}. Latest: ${this.latestProcessedHeight}`,
      );
      // In memory _processedBlockCount increase, db metadata increase BlockCount in indexer.manager
      this.setProcessedBlockCount(this._processedBlockCount + 1);
      this.latestProcessedHeight = height;
    }
  }
}
