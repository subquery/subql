// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getHeapStatistics} from 'v8';
import {Mutex} from 'async-mutex';
import {getLogger} from '../logger';

const logger = getLogger('memory');

export const memoryLock = new Mutex();

export async function waitForBatchSize(sizeInBytes: number): Promise<void> {
  let resolved = false;
  const checkHeap = async () => {
    const heapTotal = getHeapStatistics().heap_size_limit;
    const {heapUsed} = process.memoryUsage();
    const availableHeap = heapTotal - heapUsed;
    if (availableHeap >= sizeInBytes && !resolved) {
      resolved = true;
      if (memoryLock.isLocked()) {
        memoryLock.release();
      }
      return;
    }
    if (!memoryLock.isLocked()) {
      await memoryLock.acquire();
    }
    if (!resolved) {
      logger.warn('Out of Memory - waiting for heap to be freed...');
      await checkHeap();
    }
  };
  await checkHeap();
}

export function formatMBtoBytes(sizeInMB: number): number {
  return sizeInMB / 1024 / 1024;
}

export function formatBytesToMB(sizeInBytes: number): number {
  return sizeInBytes * 1024 * 1024;
}
