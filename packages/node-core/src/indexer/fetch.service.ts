// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Interval, SchedulerRegistry} from '@nestjs/schedule';
import {BaseDataSource} from '@subql/common';
import {DictionaryQueryEntry} from '@subql/types';
import {range, uniq, without} from 'lodash';
import {NodeConfig} from '../configure';
import {IndexerEvent} from '../events';
import {getLogger} from '../logger';
import {checkMemoryUsage, cleanedBatchBlocks, delay, transformBypassBlocks, waitForBatchSize} from '../utils';
import {IBlockDispatcher} from './blockDispatcher';
import {DictionaryService} from './dictionary.service';
import {DynamicDsService} from './dynamic-ds.service';
import {IProjectNetworkConfig, IProjectService} from './types';

const logger = getLogger('FetchService');
const DICTIONARY_MAX_QUERY_SIZE = 10000;
const CHECK_MEMORY_INTERVAL = 60000;

export abstract class BaseFetchService<
  DS extends BaseDataSource,
  B extends IBlockDispatcher,
  D extends DictionaryService
> implements OnApplicationShutdown
{
  private _latestBestHeight?: number;
  private _latestFinalizedHeight?: number;
  private isShutdown = false;
  private batchSizeScale = 1;
  private bypassBlocks: number[] = [];

  protected abstract buildDictionaryQueryEntries(dataSources: DS[]): DictionaryQueryEntry[];

  // If the chain doesn't have a distinction between the 2 it should return the same value for finalized and best
  protected abstract getFinalizedHeight(): Promise<number>;
  protected abstract getBestHeight(): Promise<number>;

  // The rough interval at which new blocks are produced
  protected abstract getChainInterval(): Promise<number>;
  protected abstract getModulos(): number[];
  protected abstract getFilteredHeights(): number[];

  protected abstract initBlockDispatcher(): Promise<void>;

  // Gets called just before the loop is started
  // Used by substrate to init runtime service and get runtime version data from the dictionary
  protected abstract preLoopHook(data: {startHeight: number}): Promise<void>;

  constructor(
    private nodeConfig: NodeConfig,
    protected projectService: IProjectService<DS>,
    protected networkConfig: IProjectNetworkConfig,
    protected blockDispatcher: B,
    protected dictionaryService: D,
    private dynamicDsService: DynamicDsService<DS>,
    private eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry
  ) {}

  private get latestBestHeight(): number {
    assert(this._latestBestHeight, new Error('Latest Best Height is not avaialble'));
    return this._latestBestHeight;
  }

  private get latestFinalizedHeight(): number {
    assert(this._latestFinalizedHeight, new Error('Latest Finalized Height is not avaialble'));
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

  private updateDictionary(): void {
    return this.dictionaryService.buildDictionaryEntryMap<DS>(
      this.projectService.getDataSourcesMap(),
      this.buildDictionaryQueryEntries.bind(this)
    );
  }

  private get useDictionary(): boolean {
    return (
      this.dictionaryService.useDictionary &&
      !!this.dictionaryService.queriesMap?.get(
        this.blockDispatcher.latestBufferedHeight || this.projectService.getStartBlockFromDataSources()
      )?.length
    );
  }

  async init(startHeight: number): Promise<void> {
    if (this.networkConfig?.bypassBlocks !== undefined) {
      this.bypassBlocks = transformBypassBlocks(this.networkConfig.bypassBlocks).filter((blk) => blk >= startHeight);
    }
    const interval = await this.getChainInterval();

    await Promise.all([this.getFinalizedBlockHead(), this.getBestBlockHead()]);

    this.schedulerRegistry.addInterval(
      'getFinalizedBlockHead',
      setInterval(() => void this.getFinalizedBlockHead(), interval)
    );
    this.schedulerRegistry.addInterval(
      'getBestBlockHead',
      setInterval(() => void this.getBestBlockHead(), interval)
    );

    if (this.networkConfig.dictionary || this.nodeConfig.dictionaryResolver) {
      this.updateDictionary();
      //  Call metadata here, other network should align with this
      //  For substrate, we might use the specVersion metadata in future if we have same error handling as in node-core
      await this.dictionaryService.initValidation();
    }

    await this.preLoopHook({startHeight});
    await this.initBlockDispatcher();

    void this.startLoop(startHeight);
  }

  getLatestFinalizedHeight(): number {
    return this.latestFinalizedHeight;
  }

  @Interval(CHECK_MEMORY_INTERVAL)
  checkBatchScale(): void {
    if (this.nodeConfig.scaleBatchSize) {
      const scale = checkMemoryUsage(this.batchSizeScale, this.nodeConfig);

      if (this.batchSizeScale !== scale) {
        this.batchSizeScale = scale;
      }
    }
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

  getFilteredHeightBlocks(startBlockHeight: number, endBlockHeight: number): number[] {
    const filteredBlocks = this.getFilteredHeights();
    const heights: number[] = [];
    for (let i = startBlockHeight; i < endBlockHeight; i++) {
      if (filteredBlocks.find((m) => m === i)) {
        heights.push(i);
      }
    }
    return heights;
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

  getEnqueuedModuloBlocks(startBlockHeight: number): number[] {
    return this.getModuloBlocks(
      startBlockHeight,
      this.nodeConfig.batchSize * Math.max(...this.getModulos()) + startBlockHeight
    );
  }

  async fillNextBlockBuffer(initBlockHeight: number): Promise<void> {
    let startBlockHeight: number;
    let scaledBatchSize: number;
    const handlers = [...this.projectService.getAllDataSources().map((ds) => ds.mapping.handlers)];

    const getStartBlockHeight = (): number => {
      return this.blockDispatcher.latestBufferedHeight
        ? this.blockDispatcher.latestBufferedHeight + 1
        : initBlockHeight;
    };

    if (this.useDictionary && this.dictionaryService.startHeight > getStartBlockHeight()) {
      logger.warn(
        `Dictionary start height ${
          this.dictionaryService.startHeight
        } is beyond indexing height ${getStartBlockHeight()}, skipping dictionary for now`
      );
    }

    while (!this.isShutdown) {
      startBlockHeight = getStartBlockHeight();

      scaledBatchSize = this.blockDispatcher.smartBatchSize;

      if (scaledBatchSize === 0) {
        await waitForBatchSize(this.blockDispatcher.minimumHeapLimit);
        continue;
      }

      const latestHeight = this.nodeConfig.unfinalizedBlocks ? this.latestBestHeight : this.latestFinalizedHeight;

      if (this.blockDispatcher.freeSize < scaledBatchSize || startBlockHeight > latestHeight) {
        await delay(1);
        continue;
      }

      if (this.useDictionary && startBlockHeight >= this.dictionaryService.startHeight) {
        /* queryEndBlock needs to be limited by the latest height.
         * Dictionaries could be in the future depending on if they index unfinalized blocks or the node is using an RPC endpoint that is behind.
         */
        const queryEndBlock = Math.min(startBlockHeight + DICTIONARY_MAX_QUERY_SIZE, latestHeight);
        try {
          const dictionary = await this.dictionaryService.scopedDictionaryEntries(
            startBlockHeight,
            queryEndBlock,
            scaledBatchSize
          );

          if (startBlockHeight !== getStartBlockHeight()) {
            logger.debug(`Queue was reset for new DS, discarding dictionary query result`);
            continue;
          }

          if (dictionary) {
            let {batchBlocks} = dictionary;

            const filteredHeightBlocks = this.getFilteredHeightBlocks(
              startBlockHeight,
              batchBlocks.length >= scaledBatchSize ? Math.max(...batchBlocks) : queryEndBlock
            );

            const moduloBlocks = this.getModuloBlocks(
              startBlockHeight,
              // If the results fill the batch size then use the last block in the results
              batchBlocks.length >= scaledBatchSize ? Math.max(...batchBlocks) : queryEndBlock
            );
            batchBlocks = uniq(batchBlocks.concat([...moduloBlocks, ...filteredHeightBlocks])).sort((a, b) => a - b);
            if (batchBlocks.length === 0) {
              // There we're no blocks in this query range, we can set a new height we're up to
              await this.blockDispatcher.enqueueBlocks(
                [],
                Math.min(dictionary.queryEndBlock, dictionary._metadata.lastProcessedHeight)
              );
            } else {
              const maxBlockSize = Math.min(batchBlocks.length, this.blockDispatcher.freeSize);
              const enqueueBlocks = batchBlocks.slice(0, maxBlockSize);
              await this.enqueueBlocks(enqueueBlocks);
            }
            continue; // skip nextBlockRange() way
          }
          // else use this.nextBlockRange()
        } catch (e: any) {
          logger.debug(`Fetch dictionary stopped: ${e.message}`);
          this.eventEmitter.emit(IndexerEvent.SkipDictionary);
        }
      }
      const endHeight = this.nextEndBlockHeight(startBlockHeight, scaledBatchSize);
      const enqueueFilteredBlocks = this.getFilteredHeightBlocks(startBlockHeight, endHeight);
      const enqueuingModuloBlocks =
        handlers.length && this.getModulos().length === handlers.length
          ? this.getEnqueuedModuloBlocks(startBlockHeight)
          : range(startBlockHeight, endHeight + 1);
      const actualEnqueueBlocks = uniq([...enqueuingModuloBlocks, ...enqueueFilteredBlocks])
        .sort((a, b) => a - b)
        .slice(0, this.nodeConfig.batchSize);
      await this.enqueueBlocks(actualEnqueueBlocks);
    }
  }

  private async enqueueBlocks(enqueuingBlocks: number[]): Promise<void> {
    const cleanedBatchBlocks = this.filteredBlockBatch(enqueuingBlocks);
    await this.blockDispatcher.enqueueBlocks(
      cleanedBatchBlocks,
      this.getLatestBufferHeight(cleanedBatchBlocks, enqueuingBlocks)
    );
  }

  private getLatestBufferHeight(cleanedBatchBlocks: number[], rawBatchBlocks: number[]): number {
    return Math.max(...cleanedBatchBlocks, ...rawBatchBlocks);
  }
  private filteredBlockBatch(currentBatchBlocks: number[]): number[] {
    if (!this.bypassBlocks.length || !currentBatchBlocks) {
      return currentBatchBlocks;
    }

    const cleanedBatch = cleanedBatchBlocks(this.bypassBlocks, currentBatchBlocks);

    const pollutedBlocks = this.bypassBlocks.filter((b) => b < Math.max(...currentBatchBlocks));
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

  resetForIncorrectBestBlock(blockHeight: number): void {
    this.updateDictionary();
    this.blockDispatcher.flushQueue(blockHeight);
  }
}
