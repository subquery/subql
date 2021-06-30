// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { ApiPromise } from '@polkadot/api';
import { SubqlCallFilter, SubqlEventFilter, SubqlKind } from '@subql/common';
import { isUndefined, range } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService } from './api.service';
import { BlockedQueue } from './BlockedQueue';
import { Dictionary, DictionaryService } from './dictionary.service';
import { IndexerEvent } from './events';
import { BlockContent, ProjectIndexFilters } from './types';

const logger = getLogger('fetch');
const FINALIZED_BLOCK_TIME_VARIANCE = 5;
const DICTIONARY_MAX_QUERY_SIZE = 10000;

@Injectable()
export class FetchService implements OnApplicationShutdown {
  private latestFinalizedHeight: number;
  private latestProcessedHeight: number;
  private latestBufferedHeight: number;
  private blockBuffer: BlockedQueue<BlockContent>;
  private blockNumberBuffer: BlockedQueue<number>;
  private isShutdown = false;
  private parentSpecVersion: number;
  private useDictionary: boolean;
  private projectIndexFilters: ProjectIndexFilters;

  constructor(
    private apiService: ApiService,
    protected nodeConfig: NodeConfig,
    protected project: SubqueryProject,
    private dictionaryService: DictionaryService,
    private eventEmitter: EventEmitter2,
  ) {
    this.blockBuffer = new BlockedQueue<BlockContent>(
      this.nodeConfig.batchSize * 3,
    );
    this.blockNumberBuffer = new BlockedQueue<number>(
      this.nodeConfig.batchSize * 3,
    );
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get api(): ApiPromise {
    return this.apiService.getApi();
  }

  getIndexFilters(): ProjectIndexFilters | undefined {
    const eventFilters: SubqlEventFilter[] = [];
    const extrinsicFilters: SubqlCallFilter[] = [];
    const dataSources = this.project.dataSources.filter(
      (ds) =>
        !ds.filter?.specName ||
        ds.filter.specName === this.api.runtimeVersion.specName.toString(),
    );
    for (const ds of dataSources) {
      if (ds.kind === SubqlKind.Runtime) {
        for (const handler of ds.mapping.handlers) {
          switch (handler.kind) {
            case SubqlKind.BlockHandler:
              return;
            case SubqlKind.CallHandler: {
              if (
                handler.filter?.module !== undefined &&
                handler.filter?.method !== undefined
              ) {
                if (
                  extrinsicFilters.findIndex(
                    (event) =>
                      event.module === handler.filter.module &&
                      event.method === handler.filter.method,
                  ) < 0
                ) {
                  extrinsicFilters.push(handler.filter);
                }
              } else {
                return;
              }
              break;
            }
            case SubqlKind.EventHandler: {
              if (
                handler.filter?.module !== undefined &&
                handler.filter?.method !== undefined
              ) {
                eventFilters.push(handler.filter);
                if (
                  eventFilters.findIndex(
                    (event) =>
                      event.module === handler.filter.module &&
                      event.method === handler.filter.method,
                  ) < 0
                ) {
                  eventFilters.push(handler.filter);
                }
              } else {
                return;
              }
              break;
            }
            default:
          }
        }
      }
    }
    return { eventFilters, extrinsicFilters };
  }

  register(next: (value: BlockContent) => Promise<void>): () => void {
    let stopper = false;
    void (async () => {
      while (!stopper) {
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
            await delay(5);
          }
        }
      }
    })();
    return () => (stopper = true);
  }

  async init(): Promise<void> {
    this.projectIndexFilters = this.getIndexFilters();
    this.useDictionary =
      !!this.projectIndexFilters && !!this.project.network.dictionary;
    await this.getFinalizedBlockHead();
  }

  @Interval(FINALIZED_BLOCK_TIME_VARIANCE * 1000)
  async getFinalizedBlockHead() {
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
            this.projectIndexFilters,
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
        }
      }
      // the original method: fill next batch size of blocks
      const endHeight = this.nextEndBlockHeight(startBlockHeight);
      this.blockNumberBuffer.putAll(range(startBlockHeight, endHeight));
      this.setLatestBufferedHeight(endHeight);
    }
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
      const metadataChanged = await this.fetchMeta(
        bufferBlocks[bufferBlocks.length - 1],
      );
      const blocks = await SubstrateUtil.fetchBlocksBatches(
        this.api,
        bufferBlocks,
        metadataChanged ? undefined : this.parentSpecVersion,
      );
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

  private nextEndBlockHeight(startBlockHeight: number): number {
    let endBlockHeight = startBlockHeight + this.nodeConfig.batchSize - 1;
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
      return false;
    }
    if (metaData.lastProcessedHeight < startBlockHeight) {
      logger.warn(
        `Dictionary indexed block is behind current indexing block height`,
      );
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
}
