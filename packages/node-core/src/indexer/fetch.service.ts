// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {BaseDataSource, IProjectNetworkConfig} from '@subql/types-core';
import {range, without} from 'lodash';
import {NodeConfig} from '../configure';
import {IndexerEvent} from '../events';
import {getLogger} from '../logger';
import {cleanedBatchBlocks, delay, transformBypassBlocks, waitForBatchSize} from '../utils';
import {IBlockDispatcher} from './blockDispatcher';
import {mergeNumAndBlocksToNums} from './dictionary';
import {DictionaryService} from './dictionary/dictionary.service';
import {getBlockHeight, mergeNumAndBlocks} from './dictionary/utils';
import {DynamicDsService} from './dynamic-ds.service';
import {IBlock, IProjectService} from './types';

const logger = getLogger('FetchService');

export abstract class BaseFetchService<DS extends BaseDataSource, B extends IBlockDispatcher<FB>, FB>
  implements OnApplicationShutdown
{
  private _latestBestHeight?: number;
  private _latestFinalizedHeight?: number;
  private isShutdown = false;
  private bypassBlocks: number[] = [];

  // If the chain doesn't have a distinction between the 2 it should return the same value for finalized and best
  protected abstract getFinalizedHeight(): Promise<number>;
  protected abstract getBestHeight(): Promise<number>;

  // Genesis hash is required for dictionary validation
  protected abstract getGenesisHash(): string;

  // The rough interval at which new blocks are produced
  protected abstract getChainInterval(): Promise<number>;
  protected abstract getModulos(): number[];

  protected abstract initBlockDispatcher(): Promise<void>;

  // Gets called just before the loop is started
  // Used by substrate to init runtime service and get runtime version data from the dictionary
  protected abstract preLoopHook(data: {startHeight: number}): Promise<void>;

  constructor(
    private nodeConfig: NodeConfig,
    protected projectService: IProjectService<DS>,
    protected networkConfig: IProjectNetworkConfig,
    protected blockDispatcher: B,
    protected dictionaryService: DictionaryService<DS, FB>,
    private dynamicDsService: DynamicDsService<DS>,
    private eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry
  ) {}

  private get latestBestHeight(): number {
    assert(this._latestBestHeight, new Error('Latest Best Height is not available'));
    return this._latestBestHeight;
  }

  private get latestFinalizedHeight(): number {
    assert(this._latestFinalizedHeight, new Error('Latest Finalized Height is not available'));
    return this._latestFinalizedHeight;
  }

  onApplicationShutdown(): void {
    try {
      this.schedulerRegistry.deleteInterval('getFinalizedBlockHead');
      this.schedulerRegistry.deleteInterval('getBestBlockHead');
    } catch (e) {
      //ignore if interval not exist
    }
    this.isShutdown = true;
  }

  private get useDictionary(): boolean {
    return this.dictionaryService.useDictionary(
      this.blockDispatcher.latestBufferedHeight || this.projectService.getStartBlockFromDataSources()
    );
  }

  private updateBypassBlocksFromDatasources(): void {
    const datasources = this.projectService.getDataSourcesMap().getAll();

    const heights = Array.from(datasources.keys());

    for (let i = 0; i < heights.length - 1; i++) {
      const currentHeight = heights[i];
      const nextHeight = heights[i + 1];

      const currentDS = datasources.get(currentHeight);
      // If the value for the current height is an empty array, then it's a gap
      if (currentDS && currentDS.length === 0) {
        this.bypassBlocks.push(...range(currentHeight, nextHeight));
      }
    }
  }

  async init(startHeight: number): Promise<void> {
    this.bypassBlocks = [];

    if (this.networkConfig?.bypassBlocks !== undefined) {
      this.bypassBlocks = transformBypassBlocks(this.networkConfig.bypassBlocks).filter((blk) => blk >= startHeight);
    }

    this.updateBypassBlocksFromDatasources();
    const interval = await this.getChainInterval();

    await Promise.all([this.getFinalizedBlockHead(), this.getBestBlockHead()]);

    if (startHeight > this.latestHeight()) {
      throw new Error(
        `The startBlock of dataSources in your project manifest (${startHeight}) is higher than the current chain height (${this.latestHeight()}). Please adjust your startBlock to be less that the current chain height.`
      );
    }

    this.schedulerRegistry.addInterval(
      'getFinalizedBlockHead',
      setInterval(() => void this.getFinalizedBlockHead(), interval)
    );
    this.schedulerRegistry.addInterval(
      'getBestBlockHead',
      setInterval(() => void this.getBestBlockHead(), interval)
    );

    //  We pass in genesis hash in order validate dictionary metadata, genesisHash should always exist in apiService.
    //  Call metadata here, other network should align with this
    //  For substrate, we might use the specVersion metadata in future if we have same error handling as in node-core
    await this.dictionaryService.initDictionaries();
    // Update all dictionaries execute before find one usable dictionary
    this.updateDictionary();
    // Find one usable dictionary at start

    await this.preLoopHook({startHeight});
    await this.initBlockDispatcher();

    void this.startLoop(startHeight);
  }

  private updateDictionary(): void {
    return this.dictionaryService.buildDictionaryEntryMap(this.projectService.getDataSourcesMap());
  }

  async getFinalizedBlockHead(): Promise<void> {
    try {
      const currentFinalizedHeight = await this.getFinalizedHeight();
      if (this._latestFinalizedHeight !== currentFinalizedHeight) {
        this._latestFinalizedHeight = currentFinalizedHeight;
        if (!this.nodeConfig.unfinalizedBlocks) {
          this.eventEmitter.emit(IndexerEvent.BlockTarget, {
            height: this.latestFinalizedHeight,
          });
        }
      }
    } catch (e: any) {
      logger.error(e, `Having a problem when getting finalized block`);
    }
  }

  async getBestBlockHead(): Promise<void> {
    try {
      const currentBestHeight = await this.getBestHeight();
      if (this._latestBestHeight !== currentBestHeight) {
        this._latestBestHeight = currentBestHeight;
        this.eventEmitter.emit(IndexerEvent.BlockBest, {
          height: this.latestBestHeight,
        });

        if (this.nodeConfig.unfinalizedBlocks) {
          this.eventEmitter.emit(IndexerEvent.BlockTarget, {
            height: this.latestBestHeight,
          });
        }
      }
    } catch (e: any) {
      logger.error(e, `Having a problem when getting best block`);
    }
  }

  private async startLoop(initBlockHeight: number): Promise<void> {
    await this.fillNextBlockBuffer(initBlockHeight);
  }

  getModuloBlocks(startHeight: number, endHeight: number): number[] {
    const modulos = this.getModulos();
    const moduloBlocks: number[] = [];
    for (let i = startHeight; i < endHeight; i++) {
      if (modulos.find((m) => i % m === 0)) {
        moduloBlocks.push(i);
      }
    }
    return moduloBlocks;
  }

  /**
   *
   * @param startBlockHeight
   * @param endBlockHeight is either FinalizedHeight or BestHeight, ensure ModuloBlocks not greater than this number
   */
  getEnqueuedModuloBlocks(startBlockHeight: number, endBlockHeight: number): (IBlock<FB> | number)[] {
    return this.getModuloBlocks(
      startBlockHeight,
      Math.min(this.nodeConfig.batchSize * Math.max(...this.getModulos()) + startBlockHeight, endBlockHeight)
    ).slice(0, this.nodeConfig.batchSize);
  }

  private latestHeight(): number {
    return this.nodeConfig.unfinalizedBlocks ? this.latestBestHeight : this.latestFinalizedHeight;
  }

  // eslint-disable-next-line complexity
  async fillNextBlockBuffer(initBlockHeight: number): Promise<void> {
    let startBlockHeight: number;
    let scaledBatchSize: number;
    const handlers = [...this.projectService.getAllDataSources().map((ds) => ds.mapping.handlers)];

    const getStartBlockHeight = (): number => {
      return this.blockDispatcher.latestBufferedHeight
        ? this.blockDispatcher.latestBufferedHeight + 1
        : initBlockHeight;
    };

    while (!this.isShutdown) {
      startBlockHeight = getStartBlockHeight();

      scaledBatchSize = this.blockDispatcher.smartBatchSize;

      if (scaledBatchSize === 0) {
        await waitForBatchSize(this.blockDispatcher.minimumHeapLimit);
        continue;
      }

      const latestHeight = this.latestHeight();

      if (this.blockDispatcher.freeSize < scaledBatchSize || startBlockHeight > latestHeight) {
        await delay(1);
        continue;
      }

      if (
        this.useDictionary &&
        // TODO, do we still need to check useDictionary method here, this will
        this.dictionaryService.useDictionary(startBlockHeight) &&
        startBlockHeight < this.latestFinalizedHeight
      ) {
        try {
          const dictionary = await this.dictionaryService.scopedDictionaryEntries(
            startBlockHeight,
            scaledBatchSize,
            this.latestFinalizedHeight
          );

          if (startBlockHeight !== getStartBlockHeight()) {
            logger.debug(`Queue was reset for new DS, discarding dictionary query result`);
            continue;
          }
          if (dictionary) {
            const {batchBlocks} = dictionary;
            // the last block returned from batch should have max height in this batch
            const moduloBlocks = this.getModuloBlocks(startBlockHeight, dictionary.lastBufferedHeight);
            const mergedBlocks = mergeNumAndBlocks(moduloBlocks, batchBlocks);
            if (mergedBlocks.length === 0) {
              // There we're no blocks in this query range, we can set a new height we're up to
              await this.enqueueBlocks([], dictionary.lastBufferedHeight);
            } else {
              const maxBlockSize = Math.min(mergedBlocks.length, this.blockDispatcher.freeSize);
              const enqueueBlocks = mergedBlocks.slice(0, maxBlockSize);
              await this.enqueueBlocks(enqueueBlocks, latestHeight);
            }
            continue; // skip nextBlockRange() way
          }
          // else use this.nextBlockRange()
        } catch (e: any) {
          logger.debug(`Fetch dictionary stopped: ${e.message}`);
          this.eventEmitter.emit(IndexerEvent.SkipDictionary);
        }
      } else {
        const endHeight = this.nextEndBlockHeight(startBlockHeight, scaledBatchSize);

        const enqueuingBlocks =
          handlers.length && this.getModulos().length === handlers.length
            ? this.getEnqueuedModuloBlocks(startBlockHeight, latestHeight)
            : range(startBlockHeight, endHeight + 1);

        await this.enqueueBlocks(enqueuingBlocks, latestHeight);
      }
    }
  }

  private async enqueueBlocks(enqueuingBlocks: (IBlock<FB> | number)[], latestHeight: number): Promise<void> {
    const cleanedBatchBlocks = this.filteredBlockBatch(enqueuingBlocks);
    await this.blockDispatcher.enqueueBlocks(
      cleanedBatchBlocks,
      this.getLatestBufferHeight(cleanedBatchBlocks, enqueuingBlocks, latestHeight)
    );
  }

  /**
   *
   * @param cleanedBatchBlocks
   * @param rawBatchBlocks
   * @param latestHeight
   * @private
   */
  private getLatestBufferHeight(
    cleanedBatchBlocks: (IBlock<FB> | number)[],
    rawBatchBlocks: (IBlock<FB> | number)[],
    latestHeight: number
  ): number {
    // When both BatchBlocks are empty, mean no blocks to enqueue and full synced,
    // we are safe to update latestBufferHeight to this number
    if (cleanedBatchBlocks.length === 0 && rawBatchBlocks.length === 0) {
      return latestHeight;
    }
    return Math.max(...mergeNumAndBlocksToNums(cleanedBatchBlocks, rawBatchBlocks));
  }

  private filteredBlockBatch(currentBatchBlocks: (number | IBlock<FB>)[]): (number | IBlock<FB>)[] {
    if (!this.bypassBlocks.length || !currentBatchBlocks) {
      return currentBatchBlocks;
    }

    const cleanedBatch = cleanedBatchBlocks(this.bypassBlocks, currentBatchBlocks);

    const pollutedBlocks = this.bypassBlocks.filter(
      (b) => b < Math.max(...currentBatchBlocks.map((b) => getBlockHeight(b)))
    );
    if (pollutedBlocks.length) {
      logger.info(`Bypassing blocks: ${pollutedBlocks}`);
    }
    this.bypassBlocks = without(this.bypassBlocks, ...pollutedBlocks);
    return cleanedBatch;
  }

  private nextEndBlockHeight(startBlockHeight: number, scaledBatchSize: number): number {
    let endBlockHeight = startBlockHeight + scaledBatchSize - 1;

    if (endBlockHeight > this.latestFinalizedHeight) {
      if (this.nodeConfig.unfinalizedBlocks) {
        if (endBlockHeight >= this.latestBestHeight) {
          endBlockHeight = this.latestBestHeight;
        }
      } else {
        endBlockHeight = this.latestFinalizedHeight;
      }
    }
    return endBlockHeight;
  }

  resetForNewDs(blockHeight: number): void {
    this.dynamicDsService.deleteTempDsRecords(blockHeight);
    this.updateDictionary();
    this.blockDispatcher.flushQueue(blockHeight);
  }

  getLatestFinalizedHeight(): number {
    return this.latestFinalizedHeight;
  }

  resetForIncorrectBestBlock(blockHeight: number): void {
    this.updateDictionary();
    this.blockDispatcher.flushQueue(blockHeight);
  }
}
