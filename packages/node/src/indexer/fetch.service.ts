// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getHeapStatistics } from 'v8';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { ApiPromise } from '@polkadot/api';
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
import { SubqueryProject } from '../configure/project.model';
import { getLogger } from '../utils/logger';
import { profiler, profilerWrap } from '../utils/profiler';
import { isBaseHandler, isCustomHandler } from '../utils/project';
import * as SubstrateUtil from '../utils/substrate';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { AutoQueue } from './BlockedQueue';
import {
  Dictionary,
  DictionaryService,
} from './dictionary.service';
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

const fetchBlocksBatches = argv.profiler
  ? profilerWrap(
      SubstrateUtil.fetchBlocksBatches,
      'SubstrateUtil',
      'fetchBlocksBatches',
    )
  : SubstrateUtil.fetchBlocksBatches;

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
  private blockBuffer: AutoQueue<void>;
  private blockBufferSubscription?: () => void;
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
    this.batchSizeScale = 1;
    this.blockBuffer = new AutoQueue(this.nodeConfig.batchSize * 3);
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
    this.blockBuffer.abort();
    this.blockBufferSubscription?.();
  }

  get api(): ApiPromise {
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
          this.api.runtimeVersion.specName.toString(),
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
  async getFinalizedBlockHead(): Promise<void> {
    if (!this.api) {
      logger.debug(`Skip fetch finalized block until API is ready`);
      return;
    }
    try {
      const finalizedHead = await this.api.rpc.chain.getFinalizedHead();
      const finalizedBlock = await this.api.rpc.chain.getBlock(finalizedHead);
      const currentFinalizedHeight =
        finalizedBlock.block.header.number.toNumber();
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
  async getBestBlockHead(): Promise<void> {
    if (!this.api) {
      logger.debug(`Skip fetch best block until API is ready`);
      return;
    }
    try {
      const bestHeader = await this.api.rpc.chain.getHeader();
      const currentBestHeight = bestHeader.number.toNumber();
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

  private getScaledBatchSize = () => Math.max(
    Math.round(this.batchSizeScale * this.nodeConfig.batchSize),
    MINIMUM_BATCH_SIZE,
  );

  async startLoop(
    initBlockHeight: number,
    processor: (value: BlockContent) => Promise<void> | void,
  ): Promise<void> {
    if (isUndefined(this.latestProcessedHeight)) {
      this.latestProcessedHeight = initBlockHeight - 1;
    }

    await this.fetchMeta(initBlockHeight);

    let isFetchingBlocks = false;

    // Resolves on shutdown or rejects on error
    const task = new Promise<void>((resolve, reject) => {
      // Monitor queue size to replenish
      const sub = this.blockBuffer.on('size', async (size) => {
        try {
          if (this.isShutdown) {
            resolve();
            return;
          }
          if (isFetchingBlocks) return;

          const scaledBatchSize = this.getScaledBatchSize();
          if (this.blockBuffer.freeSpace < scaledBatchSize) return;

          isFetchingBlocks = true;

          await this.queueBlocks(initBlockHeight, processor, scaledBatchSize);

          isFetchingBlocks = false;

          this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
            value: size,
          });
        } catch (e) {
          logger.error(e, `Failed to enqueue blocks for processing`);
          // TODO should blockBufferSubscription be cleaned up
          reject(e);
          sub();
        }
      });

      this.blockBufferSubscription = () => {
        sub();
        resolve();
      };
    });

    // Load initial blocks
    await this.queueBlocks(initBlockHeight, processor, this.getScaledBatchSize());

    return task;
  }

  private async queueBlocks(
    initBlockHeight: number,
    processor: (value: BlockContent) => Promise<void> | void,
    batchSize: number,
  ): Promise<void> {
    const bufferBlocks = await this.nextBlocks(initBlockHeight, batchSize);


    if (!bufferBlocks.length) {
      logger.info('No blocks to queue');
      return;
    }

    const highestBufferBlock = bufferBlocks[bufferBlocks.length - 1];
    const metadataChanged = await this.fetchMeta(highestBufferBlock);

    logger.info(
      `fetch block [${bufferBlocks[0]},${highestBufferBlock}], total ${bufferBlocks.length} blocks`,
    );
    const blocks = await fetchBlocksBatches(
      this.api,
      bufferBlocks,
      metadataChanged ? undefined : this.parentSpecVersion,
    );

    this.eventEmitter.emit(IndexerEvent.BlockBufferHeight, {
      value: highestBufferBlock,
    });

    if (!blocks) {
      // This happens with spec tests
      logger.warn('Fetching blocks result is undefined');
      return;
    }

    this.blockBuffer.putMany(
      blocks.map((block) => async () => {
        try {
          await processor(block);
        } catch (e) {
          logger.error(
            e,
            `failed to index block at height ${block.block.block.header.number.toString()} ${
              e.handler ? `${e.handler}(${e.handlerArgs ?? ''})` : ''
            }`,
          );
          process.exit(1);
        }
      }),
    );
  }

  /* Gets the next block range to query, this can be nonsequential with a dictionary */
  private async nextBlocks(initBlockHeight: number, batchSize: number): Promise<number[]> {
    const startBlockHeight = this.latestBufferedHeight
      ? this.latestBufferedHeight + 1
      : initBlockHeight;

    if (this.useDictionary) {
      const queryEndBlock = startBlockHeight + DICTIONARY_MAX_QUERY_SIZE;
      const dictionary = await this.dictionaryService.getDictionary(
        startBlockHeight,
        queryEndBlock,
        batchSize,
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
          this.setLatestBufferedHeight(batchBlocks[batchBlocks.length - 1]);
          return batchBlocks;
        }
      }
    }

    const endHeight = this.nextEndBlockHeight(startBlockHeight, batchSize);
    this.setLatestBufferedHeight(endHeight);
    return range(startBlockHeight, endHeight + 1);
  }

  @profiler(argv.profiler)
  async fetchMeta(height: number): Promise<boolean> {
    const parentBlockHash = await this.api.rpc.chain.getBlockHash(
      Math.max(height - 1, 0),
    );
    const runtimeVersion = await this.api.rpc.state.getRuntimeVersion(
      parentBlockHash,
    );
    const specVersion = runtimeVersion.specVersion.toNumber();
    if (this.parentSpecVersion !== specVersion) {
      const blockHash = await this.api.rpc.chain.getBlockHash(height);
      await SubstrateUtil.prefetchMetadata(this.api, blockHash);
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
    if (metaData.genesisHash !== this.api.genesisHash.toString()) {
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
