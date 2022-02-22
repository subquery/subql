// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { isRuntimeDataSourceV0_3_0 } from '@subql/common-terra';
import {
  SubqlTerraDatasource,
  SubqlTerraHandler,
  SubqlTerraHandlerFilter,
  SubqlTerraHandlerKind,
  SubqlTerraEventHandler,
  SubqlTerraEventFilter,
} from '@subql/types-terra';
import { LCDClient } from '@terra-money/terra.js';
import { isUndefined, range, sortBy, uniqBy } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { getLogger } from '../utils/logger';
import { isBaseTerraHandler, isCustomTerraHandler } from '../utils/project';
import { delay } from '../utils/promise';
import { fetchTerraBlocksBatches } from '../utils/terra-helper';
import { ApiTerraService } from './apiterra.service';
import { BlockedQueue } from './BlockedQueue';
import {
  TerraDictionary,
  DictionaryQueryEntry,
  TerraDictionaryService,
} from './dictionaryterra.service';
import { IndexerEvent } from './events';
import { TerraDsProcessorService } from './terrads-processor.service';
import { TerraBlockContent } from './types';
import { isCustomTerraDs, isRuntimeTerraDs } from './utils';

const logger = getLogger('fetch');
const BLOCK_TIME_VARIANCE = 5;
const DICTIONARY_MAX_QUERY_SIZE = 10000;

function eventFilterToQueryEntry(
  filter: SubqlTerraEventFilter,
): DictionaryQueryEntry {
  return {
    entity: 'events',
    conditions: [
      {
        field: 'type',
        value: filter.type,
      },
    ],
  };
}

@Injectable()
export class FetchTerraService implements OnApplicationShutdown {
  private latestFinalizedHeight: number;
  private latestProcessedHeight: number;
  private latestBufferedHeight: number;
  private blockBuffer: BlockedQueue<TerraBlockContent>;
  private blockNumberBuffer: BlockedQueue<number>;
  private isShutdown = false;
  private useDictionary: boolean;
  private dictionaryQueryEntries?: DictionaryQueryEntry[];

  constructor(
    private apiService: ApiTerraService,
    private nodeConfig: NodeConfig,
    private project: SubqueryTerraProject,
    private dictionaryService: TerraDictionaryService,
    private dsProcessorService: TerraDsProcessorService,
    private eventEmitter: EventEmitter2,
  ) {
    this.blockBuffer = new BlockedQueue<TerraBlockContent>(
      this.nodeConfig.batchSize * 3,
    );
    this.blockNumberBuffer = new BlockedQueue<number>(
      this.nodeConfig.batchSize * 3,
    );
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get api(): LCDClient {
    return this.apiService.getApi();
  }

  getDictionaryQueryEntries(): DictionaryQueryEntry[] {
    const queryEntries: DictionaryQueryEntry[] = [];

    const dataSources = this.project.dataSources.filter((ds) =>
      isRuntimeDataSourceV0_3_0(ds),
    );
    for (const ds of dataSources) {
      for (const handler of ds.mapping.handlers) {
        const baseHandlerKind = this.getBaseHandlerKind(ds, handler);
        if (baseHandlerKind === SubqlTerraHandlerKind.Block) {
          return [];
        }
        const filterList = isRuntimeTerraDs(ds)
          ? [
              (handler as SubqlTerraEventHandler)
                .filter as SubqlTerraHandlerFilter,
            ].filter(Boolean)
          : this.getBaseHandlerFilters<SubqlTerraHandlerFilter>(
              ds,
              handler.kind,
            );
        if (!filterList.length) return [];
        switch (baseHandlerKind) {
          case SubqlTerraHandlerKind.Event: {
            for (const filter of filterList as SubqlTerraEventFilter[]) {
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

  register(next: (value: TerraBlockContent) => Promise<void>): () => void {
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
              `failed to index block at height ${block.block.block.header.height.toString()} ${
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
    await this.getLatestBlockHead();
  }

  @Interval(BLOCK_TIME_VARIANCE * 1000)
  async getLatestBlockHead() {
    if (!this.api) {
      logger.debug(`Skip fetch finalized block until API is ready`);
      return;
    }
    try {
      const finalizedBlock = await this.api.tendermint.blockInfo();
      const currentFinalizedHeight = parseInt(
        finalizedBlock.block.header.height,
      );
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

  latestProcessed(height: number): void {
    this.latestProcessedHeight = height;
  }

  async startLoop(initBlockHeight: number): Promise<void> {
    if (isUndefined(this.latestProcessedHeight)) {
      this.latestProcessedHeight = initBlockHeight;
    }
    await Promise.all([
      this.fillNextBlockBuffer(initBlockHeight),
      this.fillBlockBuffer(),
    ]);
  }

  async fillNextBlockBuffer(initBlockHeight: number) {
    let startBlockHeight: number;

    while (!this.isShutdown) {
      startBlockHeight = this.latestBufferedHeight
        ? this.latestBufferedHeight + 1
        : initBlockHeight;
      if (
        this.blockNumberBuffer.freeSize < this.nodeConfig.batchSize ||
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
            this.nodeConfig.batchSize,
            this.dictionaryQueryEntries,
          );
          if (
            dictionary &&
            (await this.dictionaryValidation(dictionary, startBlockHeight))
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
      const endHeight = this.nextEndBlockHeight(startBlockHeight);
      this.blockNumberBuffer.putAll(range(startBlockHeight, endHeight + 1));
      this.setLatestBufferedHeight(endHeight);
    }
  }

  private nextEndBlockHeight(startBlockHeight: number): number {
    let endBlockHeight = startBlockHeight + this.nodeConfig.batchSize - 1;
    if (endBlockHeight > this.latestFinalizedHeight) {
      endBlockHeight = this.latestFinalizedHeight;
    }
    return endBlockHeight;
  }

  private async dictionaryValidation(
    { _metadata: metaData }: TerraDictionary,
    startBlockHeight: number,
  ): Promise<boolean> {
    const nodeInfo: any = await this.api.tendermint.nodeInfo();
    if (metaData.chainId !== nodeInfo.default_node_info.network) {
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

  async fillBlockBuffer(): Promise<void> {
    while (!this.isShutdown) {
      const takeCount = Math.min(
        this.blockBuffer.freeSize,
        this.nodeConfig.batchSize,
      );

      if (this.blockNumberBuffer.size === 0 || takeCount === 0) {
        await delay(1);
        continue;
      }

      const bufferBlocks = await this.blockNumberBuffer.takeAll(takeCount);
      const blocks = await fetchTerraBlocksBatches(this.api, bufferBlocks);
      logger.info(
        `fetch block [${bufferBlocks[0]},${
          bufferBlocks[bufferBlocks.length - 1]
        }], total ${bufferBlocks.length} blocks`,
      );
      this.blockBuffer.putAll(blocks);
      this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
        value: this.blockBuffer.size,
      });
    }
  }

  private getBaseHandlerKind(
    ds: SubqlTerraDatasource,
    handler: SubqlTerraHandler,
  ): SubqlTerraHandlerKind {
    if (isRuntimeTerraDs(ds) && isBaseTerraHandler(handler)) {
      return handler.kind;
    } else if (isCustomTerraDs(ds) && isCustomTerraHandler(handler)) {
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

  private getBaseHandlerFilters<T extends SubqlTerraHandlerFilter>(
    ds: SubqlTerraDatasource,
    handlerKind: string,
  ): T[] {
    if (isCustomTerraDs(ds)) {
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
