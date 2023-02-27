// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getHeapStatistics} from 'v8';
import AsyncLock from 'async-lock';
import {NodeConfig} from '../configure/NodeConfig';
import {getLogger} from '../logger';

const HIGH_THRESHOLD = 0.85;
const LOW_THRESHOLD = 0.6;

const logger = getLogger('memory');

export function checkMemoryUsage(batchSizeScale: number, nodeConfig: NodeConfig): number {
  const memoryData = getHeapStatistics();
  const ratio = memoryData.used_heap_size / memoryData.heap_size_limit;
  if (nodeConfig.profiler) {
    logger.info(`Heap Statistics: ${JSON.stringify(memoryData)}`);
    logger.info(`Heap Usage: ${ratio}`);
  }

  let scale = batchSizeScale;

  if (ratio > HIGH_THRESHOLD) {
    if (scale > 0) {
      scale = Math.max(scale - 0.1, 0);
      logger.debug(`Heap usage: ${ratio}, decreasing batch size by 10%`);
    }
  }

  if (ratio < LOW_THRESHOLD) {
    if (scale < 1) {
      scale = Math.min(scale + 0.1, 1);
      logger.debug(`Heap usage: ${ratio} increasing batch size by 10%`);
    }
  }
  return scale;
}

export const memoryLock = new AsyncLock();

export async function waitForHeap(sizeInMB: number) {
  const sizeInBytes = sizeInMB * 1024 * 1024;
  let resolved = false;

  return new Promise((resolve) => {
    const checkHeap = async () => {
      await memoryLock.acquire('waitForHeap', () => {
        logger.info('Out of Memory - waiting for heap to be freed...');
        const heapTotal = getHeapStatistics().heap_size_limit;
        const {heapUsed} = process.memoryUsage();
        const availableHeap = heapTotal - heapUsed;

        if (availableHeap >= sizeInBytes && !resolved) {
          resolved = true;
          resolve(() => {
            return;
          });
        }
      });

      if (!resolved) {
        await checkHeap();
      }
    };

    checkHeap();
  });
}

export function formatMBtoBytes(sizeInMB: number): number {
  return sizeInMB / 1024 / 1024;
}

export function formatBytesToMB(sizeInBytes: number): number {
  return sizeInBytes * 1024 * 1024;
}
