// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {range} from 'lodash';
import {BypassBlocks} from '../indexer';
import {filterBypassBlocks} from './blocks';

describe('bypass logic', () => {
  it('process bypassBlocks with ranges', () => {
    let bypassBlocks: BypassBlocks = [20, 40, '5-10', 20, 140];
    let currentBlockBatch = [1, 5, 7, 8, 20, 40, 100, 120];
    const case_1 = filterBypassBlocks(currentBlockBatch, bypassBlocks);

    expect(case_1).toEqual([1, 100, 120]);

    bypassBlocks = [' 5 - 10 ', 20, 140];
    currentBlockBatch = [1, 5, 7, 8, 20, 40, 100, 120];
    const case_2 = filterBypassBlocks(currentBlockBatch, bypassBlocks);

    expect(case_2).toEqual([1, 40, 100, 120]);
  });

  it('cleanedBatchBlocks with large amount blocks should not throw error Maximum call stack size exceeded', () => {
    const bypassBlocks: BypassBlocks = ['50051722-54939220'];
    const currentBlockBatch = range(34312396, 34312495);
    const case_1 = filterBypassBlocks(currentBlockBatch, bypassBlocks);
    expect(case_1).toEqual(currentBlockBatch);
  });
});
