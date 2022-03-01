// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getHeapStatistics } from 'v8';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import {
  isRuntimeDataSourceV0_2_0,
  RuntimeDataSourceV0_0_1,
  isCustomDs,
  isRuntimeDs,
} from '@subql/common';
import {
  SubqlCallFilter,
  SubqlEventFilter,
  SubqlHandlerKind,
  SubqlHandler,
  SubqlDatasource,
  SubqlHandlerFilter,
  DictionaryQueryEntry,
} from '@subql/types';
import { isUndefined, range, sortBy, uniqBy } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import { isBaseHandler, isCustomHandler } from '../utils/project';
import { delay } from '../utils/promise';
import * as SubstrateUtil from '../utils/substrate';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { SubstrateApi } from './api.substrate';
import { ApiWrapper } from './api.wrapper';
import { BlockedQueue } from './BlockedQueue';
import { Dictionary, DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { IndexerEvent } from './events';
import { BlockContent } from './types';

const logger = getLogger('fetch');
const BLOCK_TIME_VARIANCE = 5;
const DICTIONARY_MAX_QUERY_SIZE = 10000;
const CHECK_MEMORY_INTERVAL = 60000;
const HIGH_THRESHOLD = 0.85;
const LOW_THRESHOLD = 0.6;
const MINIMUM_BATCH_SIZE = 5;

const { argv } = getYargsOption();

function eventFilterToQueryEntry(
  filter: SubqlEventFilter,
): DictionaryQueryEntry {
  return {
    entity: 'events',
    conditions: [
      { field: 'module', value: filter.module },
      {
        field: 'event',
        value: filter.method,
      },
    ],
  };
}

function callFilterToQueryEntry(filter: SubqlCallFilter): DictionaryQueryEntry {
  return {
    entity: 'extrinsics',
    conditions: [
      { field: 'module', value: filter.module },
      {
        field: 'call',
        value: filter.method,
      },
    ],
  };
}

function checkMemoryUsage(batchSize: number, batchSizeScale: number): number {
  const memoryData = getHeapStatistics();
  const ratio = memoryData.used_heap_size / memoryData.heap_size_limit;
  if (argv.profiler) {
    logger.info(`Heap Statistics: ${JSON.stringify(memoryData)}`);
    logger.info(`Heap Usage: ${ratio}`);
  }
  let scale = batchSizeScale;

  if (ratio > HIGH_THRESHOLD) {
    if (scale > 0) {
      scale = Math.max(scale - 0.1, 0);
      logger.debug(`Heap usage: ${ratio}, decreasing batch size by 10%`);
    }
  }

  if (ratio < LOW_THRESHOLD) {
    if (scale < 1) {
      scale = Math.min(scale + 0.1, 1);
      logger.debug(`Heap usage: ${ratio} increasing batch size by 10%`);
    }
  }
  return scale;
}

@Injectable()
export class FetchService implements OnApplicationShutdown {
  private latestBestHeight: number;
  private latestFinalizedHeight: number;
  private latestProcessedHeight: number;
  private latestBufferedHeight: number;
  private blockBuffer: BlockedQueue<BlockContent>;
  private blockNumberBuffer: BlockedQueue<number>;
  private isShutdown = false;
  private parentSpecVersion: number;
  private useDictionary: boolean;
  private dictionaryQueryEntries?: DictionaryQueryEntry[];
  private batchSizeScale: number;

  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    private project: SubqueryProject,
    private dictionaryService: DictionaryService,
    private dsProcessorService: DsProcessorService,
    private eventEmitter: EventEmitter2,
  ) {
    this.blockBuffer = new BlockedQueue<BlockContent>(
      this.nodeConfig.batchSize * 3,
    );
    this.blockNumberBuffer = new BlockedQueue<number>(
      this.nodeConfig.batchSize * 3,
    );
    this.batchSizeScale = 1;
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get api(): ApiWrapper {
    return this.apiService.getApi();
  }

  // TODO: if custom ds doesn't support dictionary, use baseFilter, if yes, let
  getDictionaryQueryEntries(): DictionaryQueryEntry[] {
    const queryEntries: DictionaryQueryEntry[] = [];

    const dataSources = this.project.dataSources.filter(
      (ds) =>
        isRuntimeDataSourceV0_2_0(ds) ||
        !(ds as RuntimeDataSourceV0_0_1).filter?.specName ||
        (ds as RuntimeDataSourceV0_0_1).filter.specName ===
          this.api.getSpecName(),
    );
    for (const ds of dataSources) {
      const plugin = isCustomDs(ds)
        ? this.dsProcessorService.getDsProcessor(ds)
        : undefined;
      for (const handler of ds.mapping.handlers) {
        const baseHandlerKind = this.getBaseHandlerKind(ds, handler);
        let filterList: SubqlHandlerFilter[];
        if (isCustomDs(ds)) {
          const processor = plugin.handlerProcessors[handler.kind];
          if (processor.dictionaryQuery) {
            const queryEntry = processor.dictionaryQuery(handler.filter, ds);
            if (queryEntry) {
              queryEntries.push(queryEntry);
              continue;
            }
          }
          filterList = this.getBaseHandlerFilters<SubqlHandlerFilter>(
            ds,
            handler.kind,
          );
        } else {
          filterList = [handler.filter];
        }
        filterList = filterList.filter((f) => f);
        if (!filterList.length) return [];
        switch (baseHandlerKind) {
          case SubqlHandlerKind.Block:
            return [];
          case SubqlHandlerKind.Call: {
            for (const filter of filterList as SubqlCallFilter[]) {
              if (filter.module !== undefined && filter.method !== undefined) {
                queryEntries.push(callFilterToQueryEntry(filter));
              } else {
                return [];
              }
            }
            break;
          }
          case SubqlHandlerKind.Event: {
            for (const filter of filterList as SubqlEventFilter[]) {
              if (filter.module !== undefined && filter.method !== undefined) {
                queryEntries.push(eventFilterToQueryEntry(filter));
              } else {
                return [];
              }
            }
            break;
          }
          default:
        }
      }
    }

    return uniqBy(
      queryEntries,
      (item) =>
        `${item.entity}|${JSON.stringify(
          sortBy(item.conditions, (c) => c.field),
        )}`,
    );
  }

  register(next: (value: BlockContent) => Promise<void>): () => void {
    let stopper = false;
    void (async () => {
      while (!stopper && !this.isShutdown) {
        const block = await this.blockBuffer.take();
        this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
          value: this.blockBuffer.size,
        });
        let success = false;
        while (!success) {
          try {
            await next(block);
            success = true;
          } catch (e) {
            logger.error(
              e,
              `failed to index block at height ${block.block.block.header.number.toString()} ${
                e.handler ? `${e.handler}(${e.handlerArgs ?? ''})` : ''
              }`,
            );
            process.exit(1);
          }
        }
      }
    })();
    return () => (stopper = true);
  }

  async init(): Promise<void> {
    this.dictionaryQueryEntries = this.getDictionaryQueryEntries();
    this.useDictionary =
      !!this.dictionaryQueryEntries?.length &&
      !!this.project.network.dictionary;

    this.eventEmitter.emit(IndexerEvent.UsingDictionary, {
      value: Number(this.useDictionary),
    });
    await this.getFinalizedBlockHead();
    await this.getBestBlockHead();
  }

  @Interval(CHECK_MEMORY_INTERVAL)
  checkBatchScale() {
    if (argv['scale-batch-size']) {
      const scale = checkMemoryUsage(
        this.nodeConfig.batchSize,
        this.batchSizeScale,
      );

      if (this.batchSizeScale !== scale) {
        this.batchSizeScale = scale;
      }
    }
  }

  @Interval(BLOCK_TIME_VARIANCE * 1000)
  async getFinalizedBlockHead() {
    if (!this.api) {
      logger.debug(`Skip fetch finalized block until API is ready`);
      return;
    }
    try {
      const currentFinalizedHeight = await this.api.getFinalizedBlockHeight();
      if (this.latestFinalizedHeight !== currentFinalizedHeight) {
        this.latestFinalizedHeight = currentFinalizedHeight;
        this.eventEmitter.emit(IndexerEvent.BlockTarget, {
          height: this.latestFinalizedHeight,
        });
      }
    } catch (e) {
      logger.error(e, `Having a problem when get finalized block`);
    }
  }

  @Interval(BLOCK_TIME_VARIANCE * 1000)
  async getBestBlockHead() {
    if (!this.api) {
      logger.debug(`Skip fetch best block until API is ready`);
      return;
    }
    try {
      const currentBestHeight = await this.api.getLastHeight();
      if (this.latestBestHeight !== currentBestHeight) {
        this.latestBestHeight = currentBestHeight;
        this.eventEmitter.emit(IndexerEvent.BlockBest, {
          height: this.latestBestHeight,
        });
      }
    } catch (e) {
      logger.error(e, `Having a problem when get best block`);
    }
  }

  latestProcessed(height: number): void {
    this.latestProcessedHeight = height;
  }

  async startLoop(initBlockHeight: number): Promise<void> {
    if (isUndefined(this.latestProcessedHeight)) {
      this.latestProcessedHeight = initBlockHeight - 1;
    }
    await Promise.all([
      this.fillNextBlockBuffer(initBlockHeight),
      this.fillBlockBuffer(),
    ]);
  }

  async fillNextBlockBuffer(initBlockHeight: number): Promise<void> {
    await this.fetchMeta(initBlockHeight);

    let startBlockHeight: number;
    let scaledBatchSize: number;

    while (!this.isShutdown) {
      startBlockHeight = this.latestBufferedHeight
        ? this.latestBufferedHeight + 1
        : initBlockHeight;

      scaledBatchSize = Math.max(
        Math.round(this.batchSizeScale * this.nodeConfig.batchSize),
        Math.min(MINIMUM_BATCH_SIZE, this.nodeConfig.batchSize * 3),
      );

      if (
        this.blockNumberBuffer.freeSize < scaledBatchSize ||
        startBlockHeight > this.latestFinalizedHeight
      ) {
        await delay(1);
        continue;
      }
      if (this.useDictionary) {
        const queryEndBlock = startBlockHeight + DICTIONARY_MAX_QUERY_SIZE;
        try {
          const dictionary = await this.dictionaryService.getDictionary(
            startBlockHeight,
            queryEndBlock,
            scaledBatchSize,
            this.dictionaryQueryEntries,
          );
          //TODO
          // const specVersionMap = dictionary.specVersions;
          if (
            dictionary &&
            this.dictionaryValidation(dictionary, startBlockHeight)
          ) {
            const { batchBlocks } = dictionary;
            if (batchBlocks.length === 0) {
              this.setLatestBufferedHeight(
                Math.min(
                  queryEndBlock - 1,
                  dictionary._metadata.lastProcessedHeight,
                ),
              );
            } else {
              this.blockNumberBuffer.putAll(batchBlocks);
              this.setLatestBufferedHeight(batchBlocks[batchBlocks.length - 1]);
            }
            this.eventEmitter.emit(IndexerEvent.BlocknumberQueueSize, {
              value: this.blockNumberBuffer.size,
            });
            continue; // skip nextBlockRange() way
          }
          // else use this.nextBlockRange()
        } catch (e) {
          logger.debug(`Fetch dictionary stopped: ${e.message}`);
          this.eventEmitter.emit(IndexerEvent.SkipDictionary);
        }
      }
      // the original method: fill next batch size of blocks
      const endHeight = this.nextEndBlockHeight(
        startBlockHeight,
        scaledBatchSize,
      );
      this.blockNumberBuffer.putAll(range(startBlockHeight, endHeight + 1));
      this.setLatestBufferedHeight(endHeight);
    }
  }

  async fillBlockBuffer(): Promise<void> {
    while (!this.isShutdown) {
      const takeCount = Math.min(
        this.blockBuffer.freeSize,
        Math.round(this.batchSizeScale * this.nodeConfig.batchSize),
      );

      if (this.blockNumberBuffer.size === 0 || takeCount === 0) {
        await delay(1);
        continue;
      }

      const bufferBlocks = await this.blockNumberBuffer.takeAll(takeCount);
      const metadataChanged = await this.fetchMeta(
        bufferBlocks[bufferBlocks.length - 1],
      );
      const blocks = await this.api.fetchBlocksBatches(
        bufferBlocks,
        metadataChanged ? undefined : this.parentSpecVersion,
      );
      logger.info(
        `fetch block [${bufferBlocks[0]},${
          bufferBlocks[bufferBlocks.length - 1]
        }], total ${bufferBlocks.length} blocks`,
      );
      // this.blockBuffer.putAll(blocks);
      this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
        value: this.blockBuffer.size,
      });
    }
  }

  @profiler(argv.profiler)
  async fetchMeta(height: number): Promise<boolean> {
    // This function only make sense for Substrate base chain

    if (this.project.network !== 'polkadot') {
      return false;
    }
    const substrateApi = this.api as SubstrateApi;
    const parentBlockHash = await substrateApi.getBlockHash(
      Math.max(height - 1, 0),
    );
    const runtimeVersion = await substrateApi.getRuntimeVersion(
      parentBlockHash,
    );
    const specVersion = runtimeVersion.specVersion.toNumber();
    if (this.parentSpecVersion !== specVersion) {
      const blockHash = await substrateApi.getBlockHash(height);
      await SubstrateUtil.prefetchMetadata(substrateApi.getClient(), blockHash);
      this.parentSpecVersion = specVersion;
      return true;
    }
    return false;
  }

  private nextEndBlockHeight(
    startBlockHeight: number,
    scaledBatchSize: number,
  ): number {
    let endBlockHeight = startBlockHeight + scaledBatchSize - 1;

    if (endBlockHeight > this.latestFinalizedHeight) {
      endBlockHeight = this.latestFinalizedHeight;
    }
    return endBlockHeight;
  }

  private dictionaryValidation(
    { _metadata: metaData }: Dictionary,
    startBlockHeight: number,
  ): boolean {
    if (metaData.genesisHash !== this.api.getGenesisHash()) {
      logger.warn(`Dictionary is disabled since now`);
      this.useDictionary = false;
      this.eventEmitter.emit(IndexerEvent.UsingDictionary, {
        value: Number(this.useDictionary),
      });
      this.eventEmitter.emit(IndexerEvent.SkipDictionary);
      return false;
    }
    if (metaData.lastProcessedHeight < startBlockHeight) {
      logger.warn(
        `Dictionary indexed block is behind current indexing block height`,
      );
      this.eventEmitter.emit(IndexerEvent.SkipDictionary);
      return false;
    }
    return true;
  }

  private setLatestBufferedHeight(height: number): void {
    this.latestBufferedHeight = height;
    this.eventEmitter.emit(IndexerEvent.BlocknumberQueueSize, {
      value: this.blockNumberBuffer.size,
    });
  }

  private getBaseHandlerKind(
    ds: SubqlDatasource,
    handler: SubqlHandler,
  ): SubqlHandlerKind {
    if (isRuntimeDs(ds) && isBaseHandler(handler)) {
      return handler.kind;
    } else if (isCustomDs(ds) && isCustomHandler(handler)) {
      const plugin = this.dsProcessorService.getDsProcessor(ds);
      const baseHandler =
        plugin.handlerProcessors[handler.kind]?.baseHandlerKind;
      if (!baseHandler) {
        throw new Error(
          `handler type ${handler.kind} not found in processor for ${ds.kind}`,
        );
      }
      return baseHandler;
    }
  }

  private getBaseHandlerFilters<T extends SubqlHandlerFilter>(
    ds: SubqlDatasource,
    handlerKind: string,
  ): T[] {
    if (isCustomDs(ds)) {
      const plugin = this.dsProcessorService.getDsProcessor(ds);
      const processor = plugin.handlerProcessors[handlerKind];
      return processor.baseFilter instanceof Array
        ? (processor.baseFilter as T[])
        : ([processor.baseFilter] as T[]);
    } else {
      throw new Error(`expect custom datasource here`);
    }
  }
}
