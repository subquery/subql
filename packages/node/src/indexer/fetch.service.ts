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
} from '@subql/node-core';
import {
  DictionaryQueryEntry,
  ApiWrapper,
  EthereumLogFilter,
  EthereumTransactionFilter,
} from '@subql/types-ethereum';
import { range, sortBy, uniqBy } from 'lodash';
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

function eventFilterToQueryEntry(
  filter: EthereumLogFilter,
): DictionaryQueryEntry {
  const conditions = [];
  if (filter.address) {
    conditions.push({
      field: 'address',
      value: filter.address.toLowerCase(),
    });
  }
  if (filter.topics) {
    for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
      const topic = filter.topics[i];
      if (!topic) {
        continue;
      }
      const field = `topics${i}`;
      conditions.push({ field, value: eventToTopic(topic) });
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
  const conditions = [];
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
  private dictionaryQueryEntries?: DictionaryQueryEntry[];
  private batchSizeScale: number;
  private templateDynamicDatasouces: SubqlProjectDs[];
  private dictionaryGenesisMatches = true;
  private evmChainId: string;

  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    private project: SubqueryProject,
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

    // Only run the ds that is equal or less than startBlock
    // sort array from lowest ds.startBlock to highest
    const filteredDs = this.project.dataSources
      .concat(this.templateDynamicDatasouces)
      .filter((ds) => ds.startBlock <= startBlock)
      .sort((a, b) => a.startBlock - b.startBlock);

    for (const ds of filteredDs) {
      for (const handler of ds.mapping.handlers) {
        let filterList: SubqlHandlerFilter[];
        filterList = [handler.filter];
        filterList = filterList.filter((f) => f);
        if (!filterList.length) return [];
        switch (handler.kind) {
          case EthereumHandlerKind.Block:
            return [];
          case EthereumHandlerKind.Call: {
            for (const filter of filterList as EthereumTransactionFilter[]) {
              if (
                filter.from !== undefined ||
                filter.to !== undefined ||
                filter.function
              ) {
                queryEntries.push(callFilterToQueryEntry(filter));
              } else {
                return [];
              }
            }
            break;
          }
          case EthereumHandlerKind.Event: {
            for (const filter of filterList as EthereumLogFilter[]) {
              if (filter.address || filter.topics) {
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

    await this.blockDispatcher.init(this.resetForNewDs.bind(this));

    void this.startLoop(startHeight);
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

  @Interval(BLOCK_TIME_VARIANCE * 1000)
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

  @Interval(BLOCK_TIME_VARIANCE * 1000)
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

      if (this.useDictionary) {
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
              this.blockDispatcher.latestBufferedHeight = Math.min(
                queryEndBlock - 1,
                dictionary._metadata.lastProcessedHeight,
              );
            } else {
              const maxBlockSize = Math.min(
                batchBlocks.length,
                this.blockDispatcher.freeSize,
              );
              batchBlocks = batchBlocks.slice(0, maxBlockSize);
              this.blockDispatcher.enqueueBlocks(batchBlocks);
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
        this.blockDispatcher.enqueueBlocks(
          this.getEnqueuedModuloBlocks(startBlockHeight),
        );
      } else {
        this.blockDispatcher.enqueueBlocks(
          range(startBlockHeight, endHeight + 1),
        );
      }
    }
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
    { _metadata: metaData }: Dictionary,
    startBlockHeight: number,
  ): boolean {
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
    if (metaData.lastProcessedHeight < startBlockHeight) {
      logger.warn(
        `Dictionary indexed block is behind current indexing block height`,
      );
      this.eventEmitter.emit(IndexerEvent.SkipDictionary);
      return false;
    }
    return true;
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
