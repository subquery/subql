// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import {
  isCustomDs,
  EthereumHandlerKind,
  SubqlHandlerFilter,
} from '@subql/common-ethereum';
import {
  ApiService,
  Dictionary,
  checkMemoryUsage,
  delay,
  getLogger,
  IndexerEvent,
  NodeConfig,
  transformBypassBlocks,
  cleanedBatchBlocks,
} from '@subql/node-core';
import {
  DictionaryQueryEntry,
  ApiWrapper,
  EthereumLogFilter,
  EthereumTransactionFilter,
  SubqlEthereumProcessorOptions,
  DictionaryQueryCondition,
} from '@subql/types-ethereum';
import { MetaData } from '@subql/utils';
import { range, sortBy, uniqBy, without, groupBy, add } from 'lodash';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { calcInterval } from '../ethereum/utils.ethereum';
import { eventToTopic, functionToSighash } from '../utils/string';
import { IBlockDispatcher } from './blockDispatcher';
import { DictionaryService } from './dictionary.service';
import { DynamicDsService } from './dynamic-ds.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const logger = getLogger('fetch');
let BLOCK_TIME_VARIANCE = 5000;
const DICTIONARY_MAX_QUERY_SIZE = 10000;
const CHECK_MEMORY_INTERVAL = 60000;
const MINIMUM_BATCH_SIZE = 5;
const INTERVAL_PERCENT = 0.9;
const QUERY_ADDRESS_LIMIT = 50;

function eventFilterToQueryEntry(
  filter: EthereumLogFilter,
  dsOptions: SubqlEthereumProcessorOptions | SubqlEthereumProcessorOptions[],
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [];

  if (Array.isArray(dsOptions)) {
    const addresses = dsOptions.map((option) => option.address).filter(Boolean);

    if (addresses.length !== 0 && addresses.length <= QUERY_ADDRESS_LIMIT) {
      conditions.push({
        field: 'address',
        value: addresses,
        matcher: 'inInsensitive',
      });
    }
  } else {
    if (dsOptions?.address) {
      conditions.push({
        field: 'address',
        value: dsOptions.address.toLowerCase(),
        // matcher: 'equals',
      });
    }
  }
  if (filter.topics) {
    for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
      const topic = filter.topics[i];
      if (!topic) {
        continue;
      }
      const field = `topics${i}`;
      conditions.push({
        field,
        value: eventToTopic(topic),
        matcher: 'equalTo',
      });
    }
  }
  return {
    entity: 'evmLogs',
    conditions,
  };
}

function callFilterToQueryEntry(
  filter: EthereumTransactionFilter,
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [];
  if (filter.from) {
    conditions.push({
      field: 'from',
      value: filter.from.toLowerCase(),
    });
  }
  if (filter.to) {
    conditions.push({
      field: 'to',
      value: filter.to.toLowerCase(),
    });
  }
  if (filter.function) {
    conditions.push({
      field: 'func',
      value: functionToSighash(filter.function),
      matcher: 'equalTo',
    });
  }
  return {
    entity: 'evmTransactions',
    conditions,
  };
}

@Injectable()
export class FetchService implements OnApplicationShutdown {
  private latestBestHeight: number;
  private latestFinalizedHeight: number;
  private isShutdown = false;
  private batchSizeScale: number;
  private templateDynamicDatasouces: SubqlProjectDs[];
  private dictionaryGenesisMatches = true;
  private evmChainId: string;
  private bypassBlocks: number[] = [];

  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') private project: SubqueryProject,
    @Inject('IBlockDispatcher') private blockDispatcher: IBlockDispatcher,
    private dictionaryService: DictionaryService,
    private dynamicDsService: DynamicDsService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    private eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.batchSizeScale = 1;
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get api(): ApiWrapper {
    return this.apiService.api;
  }

  async syncDynamicDatascourcesFromMeta(): Promise<void> {
    this.templateDynamicDatasouces =
      await this.dynamicDsService.getDynamicDatasources();
  }

  buildDictionaryQueryEntries(startBlock: number): DictionaryQueryEntry[] {
    const queryEntries: DictionaryQueryEntry[] = [];

    type GroupedSubqlProjectDs = SubqlProjectDs & {
      groupedOptions?: SubqlEthereumProcessorOptions[];
    };

    const groupdDynamicDs: GroupedSubqlProjectDs[] = Object.values(
      groupBy(this.templateDynamicDatasouces, (ds) => ds.name),
    ).map((grouped: SubqlProjectDs[]) => {
      const options = grouped.map((ds) => ds.options);
      const ref = grouped[0];

      return {
        ...ref,
        groupedOptions: options,
      };
    });

    // Only run the ds that is equal or less than startBlock
    // sort array from lowest ds.startBlock to highest
    const filteredDs: GroupedSubqlProjectDs[] = this.project.dataSources
      .concat(groupdDynamicDs)
      .filter((ds) => ds.startBlock <= startBlock)
      .sort((a, b) => a.startBlock - b.startBlock);

    for (const ds of filteredDs) {
      for (const handler of ds.mapping.handlers) {
        // No filters, cant use dictionary
        if (!handler.filter) return [];

        switch (handler.kind) {
          case EthereumHandlerKind.Block:
            return [];
          case EthereumHandlerKind.Call: {
            const filter = handler.filter as EthereumTransactionFilter;
            if (
              filter.from !== undefined ||
              filter.to !== undefined ||
              filter.function
            ) {
              queryEntries.push(callFilterToQueryEntry(filter));
            } else {
              return [];
            }
            break;
          }
          case EthereumHandlerKind.Event: {
            const filter = handler.filter as EthereumLogFilter;
            if (ds.groupedOptions) {
              queryEntries.push(
                eventFilterToQueryEntry(filter, ds.groupedOptions),
              );
            } else if (ds.options?.address || filter.topics) {
              queryEntries.push(eventFilterToQueryEntry(filter, ds.options));
            } else {
              return [];
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

  updateDictionary(): void {
    this.dictionaryService.buildDictionaryEntryMap<SubqlProjectDs>(
      this.project.dataSources.concat(this.templateDynamicDatasouces),
      this.buildDictionaryQueryEntries.bind(this),
    );
  }

  private get useDictionary(): boolean {
    return (
      !!this.project.network.dictionary &&
      this.dictionaryGenesisMatches &&
      !!this.dictionaryService.getDictionaryQueryEntries(
        this.blockDispatcher.latestBufferedHeight ??
          Math.min(...this.project.dataSources.map((ds) => ds.startBlock)),
      ).length
    );
  }

  async init(startHeight: number): Promise<void> {
    if (this.project.network?.bypassBlocks !== undefined) {
      this.bypassBlocks = transformBypassBlocks(
        this.project.network.bypassBlocks,
      ).filter((blk) => blk >= startHeight);
    }
    if (this.api) {
      const CHAIN_INTERVAL = calcInterval(this.api) * INTERVAL_PERCENT;

      BLOCK_TIME_VARIANCE = Math.min(BLOCK_TIME_VARIANCE, CHAIN_INTERVAL);

      this.schedulerRegistry.addInterval(
        'getLatestBlockHead',
        setInterval(() => void this.getBestBlockHead(), BLOCK_TIME_VARIANCE),
      );
    }
    await this.syncDynamicDatascourcesFromMeta();

    this.updateDictionary();
    this.eventEmitter.emit(IndexerEvent.UsingDictionary, {
      value: Number(this.useDictionary),
    });

    if (this.project.network.dictionary) {
      this.evmChainId = await this.dictionaryService.getEvmChainId();
    }

    await this.getFinalizedBlockHead();
    await this.getBestBlockHead();

    //  Call metadata here, other network should align with this
    //  For substrate, we might use the specVersion metadata in future if we have same error handling as in node-core
    const metadata = await this.dictionaryService.getMetadata();

    const validChecker = this.dictionaryValidation(metadata);

    if (validChecker) {
      this.dictionaryService.setDictionaryStartHeight(
        metadata._metadata.startHeight,
      );
    }

    await this.blockDispatcher.init(this.resetForNewDs.bind(this));
    void this.startLoop(startHeight);
  }

  getUseDictionary(): boolean {
    return this.useDictionary;
  }

  getLatestFinalizedHeight(): number {
    return this.latestFinalizedHeight;
  }

  @Interval(CHECK_MEMORY_INTERVAL)
  checkBatchScale(): void {
    if (this.nodeConfig['scale-batch-size']) {
      const scale = checkMemoryUsage(this.batchSizeScale, this.nodeConfig);

      if (this.batchSizeScale !== scale) {
        this.batchSizeScale = scale;
      }
    }
  }

  @Interval(BLOCK_TIME_VARIANCE)
  async getFinalizedBlockHead(): Promise<void> {
    if (!this.api) {
      logger.debug(`Skip fetch finalized block until API is ready`);
      return;
    }
    try {
      const currentFinalizedHeight = await this.api.getFinalizedBlockHeight();
      logger.debug(`finalized:${currentFinalizedHeight.toString()}`);
      const finalizedHeader = await this.api.getBlockByHeightOrHash(
        currentFinalizedHeight,
      );
      if (this.latestFinalizedHeight !== currentFinalizedHeight) {
        this.latestFinalizedHeight = currentFinalizedHeight;
        this.unfinalizedBlocksService.registerFinalizedBlock(finalizedHeader);
        if (!this.nodeConfig.unfinalizedBlocks) {
          if (!this.nodeConfig.unfinalizedBlocks) {
            this.eventEmitter.emit(IndexerEvent.BlockTarget, {
              height: this.latestFinalizedHeight,
            });
          }
        }
      }
    } catch (e) {
      logger.warn(e, `Having a problem when get finalized block`);
    }
  }

  @Interval(BLOCK_TIME_VARIANCE)
  async getBestBlockHead(): Promise<void> {
    if (!this.api) {
      logger.debug(`Skip fetch best block until API is ready`);
      return;
    }
    try {
      const currentBestHeight = await this.api.getBestBlockHeight();
      logger.debug(`best:${currentBestHeight.toString()}`);
      if (this.latestBestHeight !== currentBestHeight) {
        this.latestBestHeight = currentBestHeight;
        this.eventEmitter.emit(IndexerEvent.BlockBest, {
          height: this.latestBestHeight,
        });

        if (this.nodeConfig.unfinalizedBlocks) {
          this.eventEmitter.emit(IndexerEvent.BlockTarget, {
            height: this.latestBestHeight,
          });
        }
      }
    } catch (e) {
      logger.warn(e, `Having a problem when get best block`);
    }
  }
  private async startLoop(initBlockHeight: number): Promise<void> {
    await this.fillNextBlockBuffer(initBlockHeight);
  }

  getModulos(): number[] {
    const modulos: number[] = [];
    for (const ds of this.project.dataSources) {
      if (isCustomDs(ds)) {
        continue;
      }
      for (const handler of ds.mapping.handlers) {
        if (
          handler.kind === EthereumHandlerKind.Block &&
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

  getEnqueuedModuloBlocks(startBlockHeight: number): number[] {
    return this.getModuloBlocks(
      startBlockHeight,
      this.nodeConfig.batchSize * Math.max(...this.getModulos()) +
        startBlockHeight,
    ).slice(0, this.nodeConfig.batchSize);
  }

  async fillNextBlockBuffer(initBlockHeight: number): Promise<void> {
    let startBlockHeight: number;
    let scaledBatchSize: number;
    const handlers = [].concat(
      ...this.project.dataSources.map((ds) => ds.mapping.handlers),
    );

    const getStartBlockHeight = (): number => {
      return this.blockDispatcher.latestBufferedHeight
        ? this.blockDispatcher.latestBufferedHeight + 1
        : initBlockHeight;
    };

    if (this.dictionaryService.startHeight > getStartBlockHeight()) {
      logger.warn(
        `Dictionary start height ${
          this.dictionaryService.startHeight
        } is beyond indexing height ${getStartBlockHeight()}, skipping dictionary for now`,
      );
    }

    while (!this.isShutdown) {
      startBlockHeight = getStartBlockHeight();

      scaledBatchSize = Math.max(
        Math.round(this.batchSizeScale * this.nodeConfig.batchSize),
        Math.min(MINIMUM_BATCH_SIZE, this.nodeConfig.batchSize * 3),
      );
      const latestHeight = this.nodeConfig.unfinalizedBlocks
        ? this.latestBestHeight
        : this.latestFinalizedHeight;

      if (
        this.blockDispatcher.freeSize < scaledBatchSize ||
        startBlockHeight > latestHeight
      ) {
        await delay(1);
        continue;
      }

      if (
        this.useDictionary &&
        startBlockHeight >= this.dictionaryService.startHeight
      ) {
        const queryEndBlock = startBlockHeight + DICTIONARY_MAX_QUERY_SIZE;
        const moduloBlocks = this.getModuloBlocks(
          startBlockHeight,
          queryEndBlock,
        );

        try {
          const dictionary =
            await this.dictionaryService.scopedDictionaryEntries(
              startBlockHeight,
              queryEndBlock,
              scaledBatchSize,
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
              // There we're no blocks in this query range, we can set a new height we're up to
              this.blockDispatcher.enqueueBlocks(
                [],
                Math.min(
                  queryEndBlock - 1,
                  dictionary._metadata.lastProcessedHeight,
                ),
              );
            } else {
              const maxBlockSize = Math.min(
                batchBlocks.length,
                this.blockDispatcher.freeSize,
              );
              const enqueuingBlocks = batchBlocks.slice(0, maxBlockSize);
              const cleanedBatchBlocks =
                this.filteredBlockBatch(enqueuingBlocks);

              this.blockDispatcher.enqueueBlocks(
                cleanedBatchBlocks,
                this.getLatestBufferHeight(cleanedBatchBlocks, enqueuingBlocks),
              );
            }
            continue; // skip nextBlockRange() way
          }
          // else use this.nextBlockRange()
        } catch (e) {
          logger.debug(`Fetch dictionary stopped: ${e.message}`);
          this.eventEmitter.emit(IndexerEvent.SkipDictionary);
        }
      }

      const endHeight = this.nextEndBlockHeight(
        startBlockHeight,
        scaledBatchSize,
      );

      if (handlers.length && this.getModulos().length === handlers.length) {
        const enqueuingBlocks = this.getEnqueuedModuloBlocks(startBlockHeight);
        const cleanedBatchBlocks = this.filteredBlockBatch(enqueuingBlocks);
        this.blockDispatcher.enqueueBlocks(
          cleanedBatchBlocks,
          this.getLatestBufferHeight(cleanedBatchBlocks, enqueuingBlocks),
        );
      } else {
        const enqueuingBlocks = range(startBlockHeight, endHeight + 1);
        const cleanedBatchBlocks = this.filteredBlockBatch(enqueuingBlocks);
        this.blockDispatcher.enqueueBlocks(
          cleanedBatchBlocks,
          this.getLatestBufferHeight(cleanedBatchBlocks, enqueuingBlocks),
        );
      }
    }
  }

  private getLatestBufferHeight(
    cleanedBatchBlocks: number[],
    rawBatchBlocks: number[],
  ): number {
    return Math.max(...cleanedBatchBlocks, ...rawBatchBlocks);
  }
  private filteredBlockBatch(currentBatchBlocks: number[]): number[] {
    if (!this.bypassBlocks.length || !currentBatchBlocks) {
      return currentBatchBlocks;
    }

    const cleanedBatch = cleanedBatchBlocks(
      this.bypassBlocks,
      currentBatchBlocks,
    );

    const pollutedBlocks = this.bypassBlocks.filter(
      (b) => b < Math.max(...currentBatchBlocks),
    );
    if (pollutedBlocks.length) {
      logger.info(`Bypassing blocks: ${pollutedBlocks}`);
    }
    this.bypassBlocks = without(this.bypassBlocks, ...pollutedBlocks);
    return cleanedBatch;
  }

  private nextEndBlockHeight(
    startBlockHeight: number,
    scaledBatchSize: number,
  ): number {
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

  private dictionaryValidation(
    dictionary: { _metadata: MetaData },
    startBlockHeight?: number,
  ): boolean {
    if (dictionary !== undefined) {
      const { _metadata: metaData } = dictionary;

      if (
        metaData.genesisHash !== this.api.getGenesisHash() &&
        this.evmChainId !== this.api.getChainId().toString()
      ) {
        logger.error(
          'The dictionary that you have specified does not match the chain you are indexing, it will be ignored. Please update your project manifest to reference the correct dictionary',
        );
        this.dictionaryGenesisMatches = false;
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

  async resetForNewDs(blockHeight: number): Promise<void> {
    await this.syncDynamicDatascourcesFromMeta();
    this.dynamicDsService.deleteTempDsRecords(blockHeight);
    this.updateDictionary();
    this.blockDispatcher.flushQueue(blockHeight);
  }

  async resetForIncorrectBestBlock(blockHeight: number): Promise<void> {
    await this.syncDynamicDatascourcesFromMeta();
    this.updateDictionary();
    this.blockDispatcher.flushQueue(blockHeight);
  }
}
