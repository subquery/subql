// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getHeapStatistics } from 'v8';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { ApiPromise } from '@polkadot/api';
import { RuntimeVersion } from '@polkadot/types/interfaces';

import {
  isRuntimeDataSourceV0_2_0,
  RuntimeDataSourceV0_0_1,
  isCustomDs,
  isRuntimeDs,
  isRuntimeDataSourceV0_3_0,
  SubstrateCallFilter,
  SubstrateEventFilter,
  SubstrateHandlerKind,
  SubstrateHandler,
  SubstrateDataSource,
  SubstrateRuntimeHandlerFilter,
} from '@subql/common-substrate';
import {
  DictionaryQueryEntry,
  SubstrateBlock,
  SubstrateCustomHandler,
} from '@subql/types';

import { MetaData } from '@subql/utils';
import { isUndefined, range, sortBy, template, uniqBy } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { getLogger } from '../utils/logger';
import { profiler, profilerWrap } from '../utils/profiler';
import { isBaseHandler, isCustomHandler } from '../utils/project';
import { delay } from '../utils/promise';
import * as SubstrateUtil from '../utils/substrate';
import { calcInterval } from '../utils/substrate';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { BlockedQueue } from './BlockedQueue';
import { DictionaryService, SpecVersion } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { IndexerEvent } from './events';
import { BlockContent } from './types';

const logger = getLogger('fetch');
let BLOCK_TIME_VARIANCE = 5000; //ms
const DICTIONARY_MAX_QUERY_SIZE = 10000;
const CHECK_MEMORY_INTERVAL = 60000;
const HIGH_THRESHOLD = 0.85;
const LOW_THRESHOLD = 0.6;
const MINIMUM_BATCH_SIZE = 5;
const SPEC_VERSION_BLOCK_GAP = 100;
const INTERVAL_PERCENT = 0.9;

const { argv } = getYargsOption();

const fetchBlocksBatches = argv.profiler
  ? profilerWrap(
      SubstrateUtil.fetchBlocksBatches,
      'SubstrateUtil',
      'fetchBlocksBatches',
    )
  : SubstrateUtil.fetchBlocksBatches;

function eventFilterToQueryEntry(
  filter: SubstrateEventFilter,
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

function callFilterToQueryEntry(
  filter: SubstrateCallFilter,
): DictionaryQueryEntry {
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
  private specVersionMap: SpecVersion[];
  private currentRuntimeVersion: RuntimeVersion;
  private templateDynamicDatasouces: SubqlProjectDs[];

  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    private project: SubqueryProject,
    private dictionaryService: DictionaryService,
    private dsProcessorService: DsProcessorService,
    private dynamicDsService: DynamicDsService,
    private eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry,
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
    try {
      this.schedulerRegistry.deleteInterval('getFinalizedBlockHead');
      this.schedulerRegistry.deleteInterval('getBestBlockHead');
    } catch (e) {
      //ignore if interval not exist
    }
    this.isShutdown = true;
  }

  get api(): ApiPromise {
    return this.apiService.getApi();
  }

  async syncDynamicDatascourcesFromMeta(): Promise<void> {
    this.templateDynamicDatasouces =
      await this.dynamicDsService.getDynamicDatasources();
  }

  getDictionaryQueryEntries(): DictionaryQueryEntry[] {
    const queryEntries: DictionaryQueryEntry[] = [];

    const dataSources = this.project.dataSources.filter(
      (ds) =>
        isRuntimeDataSourceV0_3_0(ds) ||
        isRuntimeDataSourceV0_2_0(ds) ||
        !(ds as RuntimeDataSourceV0_0_1).filter?.specName ||
        (ds as RuntimeDataSourceV0_0_1).filter.specName ===
          this.api.runtimeVersion.specName.toString(),
    );

    for (const ds of dataSources.concat(this.templateDynamicDatasouces)) {
      const plugin = isCustomDs(ds)
        ? this.dsProcessorService.getDsProcessor(ds)
        : undefined;
      for (const handler of ds.mapping.handlers) {
        const baseHandlerKind = this.getBaseHandlerKind(ds, handler);
        let filterList: SubstrateRuntimeHandlerFilter[];
        if (isCustomDs(ds)) {
          const processor = plugin.handlerProcessors[handler.kind];
          if (processor.dictionaryQuery) {
            const queryEntry = processor.dictionaryQuery(
              (handler as SubstrateCustomHandler).filter,
              ds,
            );
            if (queryEntry) {
              queryEntries.push(queryEntry);
              continue;
            }
          }
          filterList =
            this.getBaseHandlerFilters<SubstrateRuntimeHandlerFilter>(
              ds,
              handler.kind,
            );
        } else {
          filterList = [handler.filter];
        }
        filterList = filterList.filter((f) => f);
        if (!filterList.length) return [];
        switch (baseHandlerKind) {
          case SubstrateHandlerKind.Block:
            return [];
          case SubstrateHandlerKind.Call: {
            for (const filter of filterList as SubstrateCallFilter[]) {
              if (filter.module !== undefined && filter.method !== undefined) {
                queryEntries.push(callFilterToQueryEntry(filter));
              } else {
                return [];
              }
            }
            break;
          }
          case SubstrateHandlerKind.Event: {
            for (const filter of filterList as SubstrateEventFilter[]) {
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
                e.handler ? `${e.handler}(${e.stack ?? ''})` : ''
              }`,
            );
            process.exit(1);
          }
        }
      }
    })();
    return () => (stopper = true);
  }

  updateDictionary() {
    this.dictionaryQueryEntries = this.getDictionaryQueryEntries();
    this.useDictionary =
      !!this.dictionaryQueryEntries?.length &&
      !!this.project.network.dictionary;
  }

  async init(): Promise<void> {
    if (this.api) {
      const CHAIN_INTERVAL = calcInterval(this.api)
        .muln(INTERVAL_PERCENT)
        .toNumber();

      BLOCK_TIME_VARIANCE = Math.min(BLOCK_TIME_VARIANCE, CHAIN_INTERVAL);

      this.schedulerRegistry.addInterval(
        'getFinalizedBlockHead',
        setInterval(
          () => void this.getFinalizedBlockHead(),
          BLOCK_TIME_VARIANCE,
        ),
      );
      this.schedulerRegistry.addInterval(
        'getBestBlockHead',
        setInterval(() => void this.getBestBlockHead(), BLOCK_TIME_VARIANCE),
      );
    }
    await this.syncDynamicDatascourcesFromMeta();
    this.updateDictionary();
    this.eventEmitter.emit(IndexerEvent.UsingDictionary, {
      value: Number(this.useDictionary),
    });
    await this.getFinalizedBlockHead();
    await this.getBestBlockHead();

    const validChecker = this.dictionaryValidation(
      await this.dictionaryService.getSpecVersionsRaw(),
    );

    if (this.useDictionary && validChecker) {
      const specVersionResponse =
        await this.dictionaryService.getSpecVersions();
      if (specVersionResponse !== undefined) {
        this.specVersionMap = specVersionResponse;
      }
    } else {
      this.specVersionMap = [];
    }
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

  async startLoop(initBlockHeight: number): Promise<void> {
    if (isUndefined(this.latestProcessedHeight)) {
      this.latestProcessedHeight = initBlockHeight - 1;
    }
    await Promise.all([
      this.fillNextBlockBuffer(initBlockHeight),
      this.fillBlockBuffer(),
    ]);
  }

  getModulos(): number[] {
    const modulos: number[] = [];
    for (const ds of this.project.dataSources) {
      if (isCustomDs(ds)) {
        continue;
      }
      for (const handler of ds.mapping.handlers) {
        if (
          handler.kind === SubstrateHandlerKind.Block &&
          handler.filter &&
          handler.filter.modulo
        ) {
          modulos.push(handler.filter.modulo);
        }
      }
    }
    return modulos;
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

  async fillNextBlockBuffer(initBlockHeight: number): Promise<void> {
    await this.prefetchMeta(initBlockHeight);

    let startBlockHeight: number;
    let scaledBatchSize: number;

    const getStartBlockHeight = (): number => {
      return this.latestBufferedHeight
        ? this.latestBufferedHeight + 1
        : initBlockHeight;
    };

    while (!this.isShutdown) {
      startBlockHeight = getStartBlockHeight();

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
        const moduloBlocks = this.getModuloBlocks(
          startBlockHeight,
          queryEndBlock,
        );
        try {
          const dictionary = await this.dictionaryService.getDictionary(
            startBlockHeight,
            queryEndBlock,
            scaledBatchSize,
            this.dictionaryQueryEntries,
          );

          if (startBlockHeight !== getStartBlockHeight()) {
            logger.debug(
              `Queue was reset for new DS, discarding dictionary query result`,
            );
            continue;
          }

          if (
            dictionary &&
            this.dictionaryValidation(dictionary, startBlockHeight)
          ) {
            let { batchBlocks } = dictionary;
            batchBlocks = batchBlocks
              .concat(moduloBlocks)
              .sort((a, b) => a - b);
            if (batchBlocks.length === 0) {
              this.setLatestBufferedHeight(
                Math.min(
                  queryEndBlock - 1,
                  dictionary._metadata.lastProcessedHeight,
                ),
              );
            } else {
              const maxBlockSize = Math.min(
                batchBlocks.length,
                this.blockNumberBuffer.freeSize,
              );
              batchBlocks = batchBlocks.slice(0, maxBlockSize);
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

      // Used to compare before and after as a way to check if new DS created
      const bufferedHeight = this.latestBufferedHeight;

      const bufferBlocks = await this.blockNumberBuffer.takeAll(takeCount);
      const specChanged = await this.specChanged(
        bufferBlocks[bufferBlocks.length - 1],
      );
      const blocks = await fetchBlocksBatches(
        this.api,
        bufferBlocks,
        specChanged ? undefined : this.parentSpecVersion,
      );
      logger.info(
        `fetch block [${bufferBlocks[0]},${
          bufferBlocks[bufferBlocks.length - 1]
        }], total ${bufferBlocks.length} blocks`,
      );

      if (bufferedHeight > this.latestBufferedHeight) {
        logger.debug(`Queue was reset for new DS, discarding fetched blocks`);
        continue;
      }
      this.blockBuffer.putAll(blocks);
      this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
        value: this.blockBuffer.size,
      });
    }
  }

  async getSpecFromApi(height: number): Promise<number> {
    const parentBlockHash = await this.api.rpc.chain.getBlockHash(
      Math.max(height - 1, 0),
    );
    const runtimeVersion = await this.api.rpc.state.getRuntimeVersion(
      parentBlockHash,
    );
    const specVersion = runtimeVersion.specVersion.toNumber();
    return specVersion;
  }

  getSpecFromMap(
    blockHeight: number,
    specVersions: SpecVersion[],
  ): number | undefined {
    //return undefined if can not find inside range
    const spec = specVersions.find(
      (spec) => blockHeight >= spec.start && blockHeight <= spec.end,
    );
    return spec ? Number(spec.id) : undefined;
  }

  async getSpecVersion(blockHeight: number): Promise<number> {
    let currentSpecVersion: number;
    // we want to keep the specVersionMap in memory, and use it even useDictionary been disabled
    // therefore instead of check .useDictionary, we check it length before use it.
    if (this.specVersionMap && this.specVersionMap.length !== 0) {
      currentSpecVersion = this.getSpecFromMap(
        blockHeight,
        this.specVersionMap,
      );
    }
    if (currentSpecVersion === undefined) {
      currentSpecVersion = await this.getSpecFromApi(blockHeight);
      // Assume dictionary is synced
      if (blockHeight + SPEC_VERSION_BLOCK_GAP < this.latestFinalizedHeight) {
        const response = this.useDictionary
          ? await this.dictionaryService.getSpecVersions()
          : undefined;
        if (response !== undefined) {
          this.specVersionMap = response;
        }
      }
    }
    return currentSpecVersion;
  }

  async getRuntimeVersion(block: SubstrateBlock): Promise<RuntimeVersion> {
    if (
      !this.currentRuntimeVersion ||
      this.currentRuntimeVersion.specVersion.toNumber() !== block.specVersion
    ) {
      this.currentRuntimeVersion = await this.api.rpc.state.getRuntimeVersion(
        block.block.header.parentHash,
      );
    }
    return this.currentRuntimeVersion;
  }

  @profiler(argv.profiler)
  async specChanged(height: number): Promise<boolean> {
    const specVersion = await this.getSpecVersion(height);
    if (this.parentSpecVersion !== specVersion) {
      await this.prefetchMeta(height);
      this.parentSpecVersion = specVersion;
      return true;
    }
    return false;
  }

  @profiler(argv.profiler)
  async prefetchMeta(height: number) {
    const blockHash = await this.api.rpc.chain.getBlockHash(height);
    if (
      this.parentSpecVersion &&
      this.specVersionMap &&
      this.specVersionMap.length !== 0
    ) {
      const parentSpecVersion = this.specVersionMap.find(
        (spec) => Number(spec.id) === this.parentSpecVersion,
      );
      for (const specVersion of this.specVersionMap) {
        if (
          specVersion.start > parentSpecVersion.end &&
          specVersion.start <= height
        ) {
          const blockHash = await this.api.rpc.chain.getBlockHash(
            specVersion.start,
          );
          await SubstrateUtil.prefetchMetadata(this.api, blockHash);
        }
      }
    } else {
      await SubstrateUtil.prefetchMetadata(this.api, blockHash);
    }
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

  async resetForNewDs(blockHeight: number): Promise<void> {
    await this.syncDynamicDatascourcesFromMeta();
    this.updateDictionary();
    this.blockBuffer.reset();
    this.blockNumberBuffer.reset();
    this.setLatestBufferedHeight(blockHeight);
  }

  private dictionaryValidation(
    dictionary: { _metadata: MetaData },
    startBlockHeight?: number,
  ): boolean {
    if (dictionary !== undefined) {
      const { _metadata: metaData } = dictionary;

      if (metaData.genesisHash !== this.api.genesisHash.toString()) {
        logger.warn(`Dictionary is disabled since now`);
        this.useDictionary = false;
        this.eventEmitter.emit(IndexerEvent.UsingDictionary, {
          value: Number(this.useDictionary),
        });
        this.eventEmitter.emit(IndexerEvent.SkipDictionary);
        return false;
      }

      if (startBlockHeight !== undefined) {
        if (metaData.lastProcessedHeight < startBlockHeight) {
          logger.warn(
            `Dictionary indexed block is behind current indexing block height`,
          );
          this.eventEmitter.emit(IndexerEvent.SkipDictionary);
          return false;
        }
      }
      return true;
    }
    return false;
  }

  private setLatestBufferedHeight(height: number): void {
    this.latestBufferedHeight = height;
    this.eventEmitter.emit(IndexerEvent.BlocknumberQueueSize, {
      value: this.blockNumberBuffer.size,
    });
  }

  private getBaseHandlerKind(
    ds: SubstrateDataSource,
    handler: SubstrateHandler,
  ): SubstrateHandlerKind {
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

  private getBaseHandlerFilters<T extends SubstrateRuntimeHandlerFilter>(
    ds: SubstrateDataSource,
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
