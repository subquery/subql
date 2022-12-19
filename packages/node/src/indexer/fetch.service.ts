// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';

import {
  isCustomCosmosDs,
  isRuntimeCosmosDs,
  isRuntimeDataSourceV0_3_0,
  SubqlCosmosMessageFilter,
  SubqlCosmosEventFilter,
  SubqlCosmosHandlerKind,
  SubqlCosmosHandler,
  SubqlCosmosDataSource,
  SubqlCosmosHandlerFilter,
  CosmosCustomHandler,
} from '@subql/common-cosmos';
import {
  delay,
  checkMemoryUsage,
  NodeConfig,
  IndexerEvent,
  getLogger,
} from '@subql/node-core';

import { DictionaryQueryEntry, DictionaryQueryCondition } from '@subql/types';

import {
  SubqlCosmosEventHandler,
  SubqlCosmosMessageHandler,
  SubqlCosmosRuntimeHandler,
  SubqlCosmosBlockFilter,
} from '@subql/types-cosmos';

import { MetaData } from '@subql/utils';
import { range, sortBy, uniqBy, setWith } from 'lodash';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import * as CosmosUtil from '../utils/cosmos';
import { isBaseHandler, isCustomHandler } from '../utils/project';
import { ApiService, CosmosClient } from './api.service';
import { IBlockDispatcher } from './blockDispatcher/block-dispatcher.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';

const logger = getLogger('fetch');
let BLOCK_TIME_VARIANCE = 5000; //ms
const DICTIONARY_MAX_QUERY_SIZE = 10000;
const CHECK_MEMORY_INTERVAL = 60000;
const MINIMUM_BATCH_SIZE = 5;
const INTERVAL_PERCENT = 0.9;

export function eventFilterToQueryEntry(
  filter: SubqlCosmosEventFilter,
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [
    {
      field: 'type',
      value: filter.type,
      matcher: 'equalTo',
    },
  ];
  if (filter.messageFilter !== undefined) {
    const messageFilter = messageFilterToQueryEntry(
      filter.messageFilter,
    ).conditions.map((f) => {
      if (f.field === 'type') {
        return { ...f, field: 'msgType' };
      }
      return f;
    });

    conditions.push(...messageFilter);
  }
  return {
    entity: 'events',
    conditions: conditions,
  };
}

export function messageFilterToQueryEntry(
  filter: SubqlCosmosMessageFilter,
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [
    {
      field: 'type',
      value: filter.type,
      matcher: 'equalTo',
    },
  ];

  if (filter.values !== undefined) {
    const nested = {};

    // convert nested filters from `msg.swap.input_token` to { msg: { swap: { input_token: 'Token2' } } }
    Object.keys(filter.values).map((key) => {
      const value = filter.values[key];
      setWith(nested, key, value);
    });

    conditions.push({
      field: 'data',
      value: nested as any, // Cast to any for compat with node core
      matcher: 'contains',
    });
  }
  return {
    entity: 'messages',
    conditions: conditions,
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

  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    private project: SubqueryProject,
    @Inject('IBlockDispatcher') private blockDispatcher: IBlockDispatcher,
    private dictionaryService: DictionaryService,
    private dsProcessorService: DsProcessorService,
    private dynamicDsService: DynamicDsService,
    private eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry,
  ) {
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

  get api(): CosmosClient {
    return this.apiService.getApi();
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
      const plugin = isCustomCosmosDs(ds)
        ? this.dsProcessorService.getDsProcessor(ds)
        : undefined;
      for (const handler of ds.mapping.handlers) {
        const baseHandlerKind = this.getBaseHandlerKind(ds, handler);
        let filterList: SubqlCosmosHandlerFilter[];
        if (isCustomCosmosDs(ds)) {
          const processor = plugin.handlerProcessors[handler.kind];
          if (processor.dictionaryQuery) {
            const queryEntry = processor.dictionaryQuery(
              (handler as CosmosCustomHandler).filter,
              ds,
            ) as DictionaryQueryEntry;
            if (queryEntry) {
              queryEntries.push(queryEntry);
              continue;
            }
          }
          filterList = this.getBaseHandlerFilters<SubqlCosmosHandlerFilter>(
            ds,
            handler.kind,
          );
        } else {
          filterList = [
            (handler as SubqlCosmosEventHandler | SubqlCosmosMessageHandler)
              .filter,
          ];
        }
        // Filter out any undefined
        filterList = filterList.filter(Boolean);
        if (!filterList.length) return [];
        switch (baseHandlerKind) {
          case SubqlCosmosHandlerKind.Block:
            for (const filter of filterList as SubqlCosmosBlockFilter[]) {
              if (filter.modulo === undefined) {
                return [];
              }
            }
            break;
          case SubqlCosmosHandlerKind.Message: {
            for (const filter of filterList as SubqlCosmosMessageFilter[]) {
              if (filter.type !== undefined) {
                queryEntries.push(messageFilterToQueryEntry(filter));
              } else {
                return [];
              }
            }
            break;
          }
          case SubqlCosmosHandlerKind.Event: {
            for (const filter of filterList as SubqlCosmosEventFilter[]) {
              if (filter.type !== undefined) {
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
      const CHAIN_INTERVAL =
        CosmosUtil.calcInterval(this.api) * INTERVAL_PERCENT;

      BLOCK_TIME_VARIANCE = Math.min(BLOCK_TIME_VARIANCE, CHAIN_INTERVAL);

      this.schedulerRegistry.addInterval(
        'getLatestBlockHead',
        setInterval(() => void this.getLatestBlockHead(), BLOCK_TIME_VARIANCE),
      );
    }

    await this.syncDynamicDatascourcesFromMeta();
    this.updateDictionary();
    this.eventEmitter.emit(IndexerEvent.UsingDictionary, {
      value: Number(this.useDictionary),
    });
    await this.getLatestBlockHead();

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

  async getLatestBlockHead(): Promise<void> {
    if (!this.api) {
      logger.debug(`Skip fetch finalized block until API is ready`);
      return;
    }
    try {
      const currentFinalizedHeight = await this.api.getHeight();
      if (this.latestFinalizedHeight !== currentFinalizedHeight) {
        this.latestFinalizedHeight = currentFinalizedHeight;
        if (!this.nodeConfig.unfinalizedBlocks) {
          this.eventEmitter.emit(IndexerEvent.BlockTarget, {
            height: this.latestFinalizedHeight,
          });
        }
      }
    } catch (e) {
      logger.warn(e, `Having a problem when getting finalized block`);
    }
  }

  private async startLoop(initBlockHeight: number): Promise<void> {
    await this.fillNextBlockBuffer(initBlockHeight);
  }

  getModulos(): number[] {
    const modulos: number[] = [];
    for (const ds of this.project.dataSources) {
      if (isCustomCosmosDs(ds)) {
        continue;
      }
      for (const handler of ds.mapping.handlers) {
        if (
          handler.kind === SubqlCosmosHandlerKind.Block &&
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
    let startBlockHeight: number;
    let scaledBatchSize: number;

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

      if (
        this.blockDispatcher.freeSize < scaledBatchSize ||
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
            (await this.dictionaryValidation(dictionary, startBlockHeight))
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
      // the original method: fill next batch size of blocks
      const endHeight = this.nextEndBlockHeight(
        startBlockHeight,
        scaledBatchSize,
      );
      this.blockDispatcher.enqueueBlocks(
        range(startBlockHeight, endHeight + 1),
      );
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
    this.blockDispatcher.flushQueue(blockHeight);
  }

  private async dictionaryValidation(
    dictionary: { _metadata: MetaData },
    startBlockHeight?: number,
  ): Promise<boolean> {
    if (dictionary !== undefined) {
      const { _metadata: metaData } = dictionary;

      const chain = await this.api.getChainId();
      if (metaData.chain !== chain) {
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

  async resetForIncorrectBestBlock(blockHeight: number): Promise<void> {
    await this.syncDynamicDatascourcesFromMeta();
    this.updateDictionary();
    this.blockDispatcher.flushQueue(blockHeight);
  }

  private getBaseHandlerKind(
    ds: SubqlCosmosDataSource,
    handler: SubqlCosmosHandler,
  ): SubqlCosmosHandlerKind {
    if (isRuntimeCosmosDs(ds) && isBaseHandler(handler)) {
      return (handler as SubqlCosmosRuntimeHandler).kind;
    } else if (isCustomCosmosDs(ds) && isCustomHandler(handler)) {
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

  private getBaseHandlerFilters<T extends SubqlCosmosHandlerFilter>(
    ds: SubqlCosmosDataSource,
    handlerKind: string,
  ): T[] {
    if (isCustomCosmosDs(ds)) {
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
