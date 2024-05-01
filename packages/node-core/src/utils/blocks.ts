// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Schedule} from 'cron-converter';
import {chunk, flatten, isNumber, range, uniq, without} from 'lodash';
import {getBlockHeight} from '../indexer/dictionary';
import {IBlock} from '../indexer/types';
import {getLogger} from '../logger';

export function cleanedBatchBlocks<FB>(
  bypassBlocks: number[],
  currentBlockBatch: (IBlock<FB> | number)[]
): (IBlock<FB> | number)[] {
  // Use suggested work around to avoid Maximum call stack size exceeded issue when large numbers of transformedBlocks
  // https://github.com/lodash/lodash/issues/5552
  const transformedBlocks = transformBypassBlocks(bypassBlocks);
  let result = currentBlockBatch;
  chunk(transformedBlocks, 10000).forEach((chunk) => {
    result = without(
      result.map((r) => getBlockHeight(r)),
      ...chunk
    );
  });
  return result;
}

export function transformBypassBlocks(bypassBlocks: (number | string)[]): number[] {
  if (!bypassBlocks?.length) return [];

  return uniq(
    flatten(
      bypassBlocks.map((bypassEntry) => {
        if (isNumber(bypassEntry)) return [bypassEntry];
        const splitRange = bypassEntry.split('-').map((val) => parseInt(val.trim(), 10));
        return range(splitRange[0], splitRange[1] + 1);
      })
    )
  );
}

const logger = getLogger('timestamp-filter');

export type CronFilter = {
  cronSchedule?: {
    schedule: Schedule;
    next: number;
  };
};

export function filterBlockTimestamp(blockTimestamp: number, filter: CronFilter): boolean {
  if (!filter.cronSchedule) {
    return true;
  }
  if (blockTimestamp > filter.cronSchedule.next) {
    logger.info(`Block with timestamp ${new Date(blockTimestamp).toString()} is about to be indexed`);
    logger.info(`Next block will be indexed at ${new Date(filter.cronSchedule.next).toString()}`);
    filter.cronSchedule.schedule.prev();
    return true;
  } else {
    filter.cronSchedule.schedule.prev();
    return false;
  }
}
