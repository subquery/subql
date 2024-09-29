// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Schedule} from 'cron-converter';
import {getBlockHeight} from '../indexer/dictionary';
import {BypassBlocks, IBlock} from '../indexer/types';
import {getLogger} from '../logger';

const logger = getLogger('timestamp-filter');

export type CronFilter = {
  cronSchedule?: {
    schedule: Schedule;
    next: number;
  };
};

export function filterBlockTimestamp(blockTimestamp: number, filter: CronFilter): boolean {
  if (!filter?.cronSchedule) {
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

/**
 * Takes a list of blocks or block numbers to be enqueued and indexed and removes any based on the bypassBlocks
 * TODO this could further be optimised by returning the end of a block range to fast forward to.
 * */
export function filterBypassBlocks<B = any>(
  enqueuedBlocks: (IBlock<B> | number)[],
  bypassBlocks?: BypassBlocks
): (IBlock<B> | number)[] {
  if (!bypassBlocks?.length) return enqueuedBlocks;

  return enqueuedBlocks.filter((b) => {
    if (typeof b === 'number') !inBypassBlocks(bypassBlocks, b);
    return !inBypassBlocks(bypassBlocks, getBlockHeight(b));
  });
}

function inBypassBlocks(bypassBlocks: BypassBlocks, blockNum: number): boolean {
  return bypassBlocks.some((bypassEntry) => {
    if (typeof bypassEntry === 'number') return bypassEntry === blockNum;
    const [start, end] = bypassEntry.split('-').map((val) => parseInt(val.trim(), 10));
    return blockNum >= start && blockNum <= end;
  });
}
