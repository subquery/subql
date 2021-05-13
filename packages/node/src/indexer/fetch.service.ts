// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { ApiPromise } from '@polkadot/api';
import { isUndefined } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService } from './api.service';
import { BlockedQueue } from './BlockedQueue';
import { IndexerEvent } from './events';
import { BlockContent } from './types';

const logger = getLogger('fetch');
const FINALIZED_BLOCK_TIME_VARIANCE = 5;

@Injectable()
export class FetchService implements OnApplicationShutdown {
  private latestFinalizedHeight: number;
  private latestProcessedHeight: number;
  private latestPreparedHeight: number;
  private blockBuffer: BlockedQueue<BlockContent>;
  private isShutdown = false;
  private parentSpecVersion: number;

  constructor(
    private apiService: ApiService,
    protected nodeConfig: NodeConfig,
    private eventEmitter: EventEmitter2,
  ) {
    this.blockBuffer = new BlockedQueue<BlockContent>(
      this.nodeConfig.batchSize * 3,
    );
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get api(): ApiPromise {
    return this.apiService.getApi();
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
    this.api.on('connected', () => this.getFinalizedBlockHead());
    await this.getFinalizedBlockHead();
  }

  @Interval(FINALIZED_BLOCK_TIME_VARIANCE * 1000)
  async getFinalizedBlockHead() {
    const finalizedHead = await this.api.rpc.chain.getFinalizedHead();
    const finalizedBlock = await this.api.rpc.chain.getBlock(finalizedHead);
    this.latestFinalizedHeight = finalizedBlock.block.header.number.toNumber();
    this.eventEmitter.emit(IndexerEvent.BlockTarget, {
      height: this.latestFinalizedHeight,
    });
  }

  latestProcessed(height: number): void {
    this.latestProcessedHeight = height;
  }

  async startLoop(initBlockHeight: number): Promise<void> {
    if (isUndefined(this.latestProcessedHeight)) {
      this.latestProcessedHeight = initBlockHeight - 1;
    }
    await this.fetchMeta(initBlockHeight);
    // eslint-disable-next-line no-constant-condition
    while (!this.isShutdown) {
      const [startBlockHeight, endBlockHeight] =
        this.nextBlockRange(initBlockHeight) ?? [];
      if (isUndefined(startBlockHeight)) {
        await delay(1);
        continue;
      }
      logger.info(`fetch block [${startBlockHeight}, ${endBlockHeight}]`);
      const metadataChanged = await this.fetchMeta(endBlockHeight);
      const blocks = await (this.nodeConfig.preferRange
        ? SubstrateUtil.fetchBlocksViaRangeQuery(
            this.api,
            startBlockHeight,
            endBlockHeight,
          )
        : SubstrateUtil.fetchBlocks(
            this.api,
            startBlockHeight,
            endBlockHeight,
            metadataChanged ? undefined : this.parentSpecVersion,
          ));
      for (const block of blocks) {
        this.blockBuffer.put(block);
      }
      this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
        value: this.blockBuffer.size,
      });
      this.latestPreparedHeight = endBlockHeight;
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

  private nextBlockRange(
    initBlockHeight: number,
  ): [number, number] | undefined {
    const preloadBlocks = this.nodeConfig.batchSize * 2;
    let startBlockHeight: number;
    if (this.latestPreparedHeight === undefined) {
      startBlockHeight = initBlockHeight;
    } else if (
      this.latestPreparedHeight - this.latestProcessedHeight <
      preloadBlocks
    ) {
      startBlockHeight = this.latestPreparedHeight + 1;
    } else {
      return;
    }
    if (startBlockHeight > this.latestFinalizedHeight) {
      return;
    }
    let endBlockHeight = startBlockHeight + this.nodeConfig.batchSize - 1;
    if (endBlockHeight > this.latestFinalizedHeight) {
      endBlockHeight = this.latestFinalizedHeight;
    }
    return [startBlockHeight, endBlockHeight];
  }
}
