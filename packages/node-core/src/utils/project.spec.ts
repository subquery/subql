// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {range} from 'lodash';
import {cleanedBatchBlocks, transformBypassBlocks} from './project';

describe('bypass logic', () => {
  it('process bypassBlocks with ranges', () => {
    let bypassBlocks = transformBypassBlocks([20, 40, '5-10', 20, 140]);
    expect(bypassBlocks).toEqual([20, 40, 5, 6, 7, 8, 9, 10, 140]);
    let currentBlockBatch = [1, 5, 7, 8, 20, 40, 100, 120];
    const case_1 = cleanedBatchBlocks(bypassBlocks, currentBlockBatch);

    expect(case_1).toEqual([1, 100, 120]);

    bypassBlocks = transformBypassBlocks([' 5 - 10 ', 20, 140]);
    currentBlockBatch = [1, 5, 7, 8, 20, 40, 100, 120];
    const case_2 = cleanedBatchBlocks(bypassBlocks, currentBlockBatch);

    expect(case_2).toEqual([1, 40, 100, 120]);
  });

  it('cleanedBatchBlocks with large amount blocks should not throw error Maximum call stack size exceeded', () => {
    const bypassBlocks = transformBypassBlocks(['50051722-54939220']);
    const currentBlockBatch = range(34312396, 34312495);
    const case_1 = cleanedBatchBlocks(bypassBlocks, currentBlockBatch);
    expect(case_1).toEqual(currentBlockBatch);
  });
});
