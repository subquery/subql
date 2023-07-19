// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getHeapStatistics} from 'v8';
import {Injectable} from '@nestjs/common';
import {formatMBtoBytes} from '../utils';
import {BlockSizeBuffer} from '../utils/blockSizeBuffer';

@Injectable()
export class SmartBatchService {
  private blockSizeBuffer: BlockSizeBuffer;

  constructor(private maxBatchSize: number, private minHeapRequired: number = formatMBtoBytes(128)) {
    this.blockSizeBuffer = new BlockSizeBuffer(maxBatchSize);
  }

  get minimumHeapRequired(): number {
    return this.minHeapRequired;
  }

  addToSizeBuffer(blocks: any[]): void {
    // Non-null assertion because we define a capacity
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const freeSpace = this.blockSizeBuffer.freeSpace!;
    if (this.blockSizeBuffer.capacity && blocks.length > freeSpace) {
      this.blockSizeBuffer.takeMany(blocks.length - freeSpace);
    }
    blocks.forEach((block) => this.blockSizeBuffer.put(this.blockSize(block)));
  }

  blockSize(block: any): number {
    let size = 0;
    const stack: {obj: any; prop: any}[] = [
      {obj: block, prop: null},
      {obj: null, prop: null},
    ]; // Add sentinel value

    while (stack.length > 1) {
      // Check for sentinel value
      const item = stack.pop();
      if (!item) continue;
      const {obj, prop} = item;
      const type = typeof obj;

      if (type === 'string') {
        size += Buffer.byteLength(obj);
      } else if (type === 'number' || type === 'boolean' || obj === null || obj === undefined) {
        size += String(obj).length;
      } else if (type === 'bigint') {
        size += obj.toString().length;
      } else if (Array.isArray(obj)) {
        size += 1; // opening bracket
        stack.push({obj: null, prop: null}); // sentinel
        for (let i = obj.length - 1; i >= 0; i--) {
          stack.push({obj: obj[i], prop: i});
        }
      } else if (type === 'object') {
        size += 1; // opening brace
        stack.push({obj: null, prop: null}); // sentinel
        const keys = Object.keys(obj).sort();
        for (let i = keys.length - 1; i >= 0; i--) {
          const key = keys[i];
          stack.push({obj: obj[key], prop: key});
        }
      } else {
        throw new Error(`Cannot serialize ${type}`);
      }

      if (stack[stack.length - 1].prop !== prop && obj !== null && obj !== undefined) {
        // Check for undefined/null values
        size += 1; // comma or closing bracket/brace
      }
    }

    return size;
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
