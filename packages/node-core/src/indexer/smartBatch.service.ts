// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getHeapStatistics} from 'v8';
import {Injectable} from '@nestjs/common';
import {formatMBtoBytes} from '../utils';
import {BlockSizeBuffer} from '../utils/blockSizeBuffer';

@Injectable()
export class SmartBatchService {
  private blockSizeBuffer: BlockSizeBuffer;
  private memoryLimit: number;

  constructor(private maxBatchSize: number, private minHeapRequired?: number) {
    this.blockSizeBuffer = new BlockSizeBuffer(maxBatchSize);
    this.memoryLimit = process.memoryUsage().heapTotal;
    if (!minHeapRequired) {
      this.minHeapRequired = formatMBtoBytes(128);
    }
  }

  get minimumHeapRequired(): number {
    return this.minHeapRequired;
  }

  addToSizeBuffer(blocks: any[]): void {
    if (this.blockSizeBuffer.capacity && blocks.length > this.blockSizeBuffer.freeSpace) {
      this.blockSizeBuffer.takeMany(blocks.length - this.blockSizeBuffer.freeSpace);
    }
    blocks.forEach((block) => this.blockSizeBuffer.put(this.blockSize(block)));
  }

  blockSize(block: any): number {
    return Buffer.byteLength(
      JSON.stringify(block, (key, value) => (typeof value === 'bigint' ? value.toString() : value))
    );
  }

  heapMemoryLimit(): number {
    return getHeapStatistics().heap_size_limit - this.minHeapRequired;
  }

  getSafeBatchSize(): number {
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

  safeBatchSizeForRemainingMemory(memLeft: number): number {
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
