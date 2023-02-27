// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getHeapStatistics } from 'v8';
import { Injectable } from '@nestjs/common';
import { getLogger } from '@subql/node-core';
import { BlockSizeBuffer } from '../utils/blockSizeBuffer';

const logger = getLogger('smart-batch-service');

@Injectable()
export class SmartBatchService {
  private blockSizeBuffer: BlockSizeBuffer;
  private memoryLimit: number;

  constructor(private maxBatchSize: number) {
    this.blockSizeBuffer = new BlockSizeBuffer(maxBatchSize);
    this.memoryLimit = process.memoryUsage().heapTotal;
  }

  addToSizeBuffer(blocks: any[]) {
    blocks.forEach((block) => this.blockSizeBuffer.put(this.blockSize(block)));
  }

  blockSize(block: any): number {
    return Buffer.byteLength(JSON.stringify(block));
  }

  heapMemoryLimit(): number {
    //make sure there is atleast 256mb left in heap to fetch next batch
    return getHeapStatistics().heap_size_limit - 256 * 1024 * 1024;
  }

  getSafeBatchSize() {
    const heapUsed = getHeapStatistics().used_heap_size;
    let averageBlockSize;

    try {
      averageBlockSize = this.blockSizeBuffer.average();
    } catch (e) {
      return this.maxBatchSize;
    }

    const heapleft = this.heapMemoryLimit() - heapUsed;

    //stop fetching until memory is freed
    if (heapleft <= 0) {
      return 0;
    }

    const safeBatchSize = Math.floor(heapleft / averageBlockSize);
    return Math.min(safeBatchSize, this.maxBatchSize);
  }

  safeBatchSizeForRemainingMemory(memLeft: number) {
    let averageBlockSize;

    try {
      averageBlockSize = this.blockSizeBuffer.average();
    } catch (e) {
      return this.maxBatchSize;
    }

    const safeBatchSize = Math.floor(memLeft / averageBlockSize);
    return Math.min(safeBatchSize, this.maxBatchSize);
  }
}
