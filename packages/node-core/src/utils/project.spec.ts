// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {range} from 'lodash';
import {bypassBlocksValidator} from './project';

describe('bypass logic', () => {
  it('filter out bypassBlocks', () => {
    // batchBlocks contain partial bypassBlocks
    const currentBatchBlocks = range(1, 10);
    let bypassBlocks = [2, 3, 9, 5, 11, 100];
    let [processedBypassBlocks, processedBatchBlocks] = bypassBlocksValidator(bypassBlocks, currentBatchBlocks);
    expect(processedBatchBlocks).toEqual([1, 4, 6, 7, 8]);
    expect(processedBypassBlocks).toEqual([11, 100]);

    // batchBlocks contain all bypassBlocks
    bypassBlocks = range(1, 10);
    [processedBypassBlocks, processedBatchBlocks] = bypassBlocksValidator(bypassBlocks, currentBatchBlocks);
    expect(processedBatchBlocks).toEqual([]);
    expect(processedBypassBlocks).toEqual([]);

    // bypassBlocks size greater than batchSize
    bypassBlocks = range(1, 15);
    [processedBypassBlocks, processedBatchBlocks] = bypassBlocksValidator(bypassBlocks, currentBatchBlocks);
    expect(processedBatchBlocks).toEqual([]);
    expect(processedBypassBlocks).toEqual([10, 11, 12, 13, 14]);

    const dictionaryBatchBlocks = [7, 9, 892, 100];
    bypassBlocks = [9, 1, 10, 12];
    [processedBypassBlocks, processedBatchBlocks] = bypassBlocksValidator(bypassBlocks, dictionaryBatchBlocks);
    expect(processedBatchBlocks).toEqual([7, 892, 100]);
    expect(processedBypassBlocks).toEqual([1, 10, 12]);
  });
});
