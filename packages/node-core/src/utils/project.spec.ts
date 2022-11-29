// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {cleanedBatchBlocks, transformBypassBlocks} from './project';

describe('bypass logic', () => {
  it('process bypassBlocks with ranges', () => {
    let bypassBlocks = transformBypassBlocks([20, 40, '5-10', 20, 140]);
    let currentBlockBatch = [1, 5, 7, 8, 20, 40, 100, 120];
    const case_1 = cleanedBatchBlocks(bypassBlocks, currentBlockBatch);

    expect(case_1).toEqual([1, 100, 120]);

    bypassBlocks = transformBypassBlocks([' 5 - 10 ', 20, 140]);
    currentBlockBatch = [1, 5, 7, 8, 20, 40, 100, 120];
    const case_2 = cleanedBatchBlocks(bypassBlocks, currentBlockBatch);

    expect(case_2).toEqual([1, 40, 100, 120]);
  });
});
