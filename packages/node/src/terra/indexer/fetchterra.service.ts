import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { LCDClient } from '@terra-money/terra.js';
import { EventEmitter2 } from 'eventemitter2';
import { isUndefined, range, sortBy, uniqBy } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { getLogger } from '../utils/logger';
import { isBaseTerraHandler, isCustomTerraHandler } from '../utils/project';
import { delay } from '../utils/promise';
import { fetchTerraBlocksBatches } from '../utils/terra-helper';
import { ApiTerraService } from './apiterra.service';
import { BlockedQueue } from './BlockedQueue';
//import { DictionaryQueryEntry, DictionaryService } from './dictionary.service';
import { IndexerEvent } from './events';
import { TerraDsProcessorService } from './terrads-processor.service';
import {
  SubqlTerraDatasource,
  SubqlTerraHandler,
  SubqlTerraHandlerKind,
} from './terraproject';
import { TerraBlockContent } from './types';
import { isCustomTerraDs, isRuntimeTerraDs } from './utils';

const logger = getLogger('fetch');
const BLOCK_TIME_VARIANCE = 5;
const DICTIONARY_MAX_QUERY_SIZE = 10000;

@Injectable()
export class FetchTerraService implements OnApplicationShutdown {
  private latestFinalizedHeight: number;
  private latestProcessedHeight: number;
  private latestBufferedHeight: number;
  private blockBuffer: BlockedQueue<TerraBlockContent>;
  private blockNumberBuffer: BlockedQueue<number>;
  private isShutdown = false;
  private parentSpecVersion: number;
  private useDictionary: boolean;
  //private dictionaryQueryEntries?: DictionaryQueryEntry[];

  constructor(
    private apiService: ApiTerraService,
    private nodeConfig: NodeConfig,
    private project: SubqueryTerraProject,
    //private dictionaryService: DictionaryService,
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

  //todo: implement getDictionaryQueryEntries
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
    this.useDictionary = false;
    //TODO: implement dictionary
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
      //TODO: implement useDictionary
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

  // implement getBaseHandlerFilters
}
