// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {range} from 'lodash';
import {cleanedBatchBlocks, transformBypassBlocks} from './project';

describe('bypass logic', () => {
  it('filter out bypassBlocks', () => {
    // batchBlocks contain partial bypassBlocks
    //   const currentBatchBlocks = range(1, 10);
    //   let bypassBlocks = [2, 3, 9, 5, 11, 100];
    //   const case_1 = cleanedBatchBlocks(bypassBlocks, currentBatchBlocks);
    //   expect(case_1.processedBatchBlocks).toEqual([1, 4, 6, 7, 8]);
    //   expect(case_1.processedBypassBlocks).toEqual([11, 100]);
    //
    //   // batchBlocks contain all bypassBlocks
    //   bypassBlocks = range(1, 10);
    //   const case_2 = cleanedBatchBlocks(bypassBlocks, currentBatchBlocks);
    //   expect(case_2.processedBatchBlocks).toEqual([]);
    //   expect(case_2.processedBypassBlocks).toEqual([]);
    //
    //   // bypassBlocks size greater than batchSize
    //   bypassBlocks = range(1, 15);
    //   const case_3 = cleanedBatchBlocks(bypassBlocks, currentBatchBlocks);
    //   expect(case_3.processedBatchBlocks).toEqual([]);
    //   expect(case_3.processedBypassBlocks).toEqual([10, 11, 12, 13, 14]);
    //
    //   const dictionaryBatchBlocks = [7, 9, 892, 100];
    //   bypassBlocks = [9, 1, 10, 12];
    //   const case_4 = cleanedBatchBlocks(bypassBlocks, dictionaryBatchBlocks);
    //   expect(case_4.processedBatchBlocks).toEqual([7, 892, 100]);
    //   expect(case_4.processedBypassBlocks).toEqual([1, 10, 12]);
  });
  it('process bypassBlocks with ranges', () => {
    // let bypassBlocks = transformBypassBlocks([20, 40, '5-10', 20, 140]);
    // let currentBlockBatch = [1, 5, 7, 8, 20, 40, 100, 120];
    // const case_1 = cleanedBatchBlocks(bypassBlocks, currentBlockBatch);
    // console.log('12301931 ',case_1.processedBypassBlocks)
    /*
    5,
    7,
    8,
    20,
    40
     */
    // expect(case_1.processedBatchBlocks).toEqual([1, 100, 120]);
    // expect(case_1.processedBypassBlocks).toEqual([6, 9, 140]);
    //
    // bypassBlocks = transformBypassBlocks([' 5 - 10 ', 20, 140]);
    // console.log(bypassBlocks)
    // currentBlockBatch = [1, 5, 7, 8, 20, 40, 100, 120];
    // const case_2 = cleanedBatchBlocks(bypassBlocks, currentBlockBatch);
    //
    // expect(case_2.processedBatchBlocks).toEqual([1, 40, 100, 120]);
    // expect(case_2.processedBypassBlocks).toEqual([6, 9, 140]);
  });
  it('base mvp', () => {
    const currentBatch = [1, 2, 3, 4, 6, 7, 8, 9, 10];
    const bypassBlocks = transformBypassBlocks([' 1 - 5 ', 7]);

    // transform any stringed range
    expect(bypassBlocks).toEqual([1, 2, 3, 4, 5, 7]);

    const output = cleanedBatchBlocks(bypassBlocks, currentBatch);
    expect(output).toEqual([6, 8, 9, 10]);
  });
});
