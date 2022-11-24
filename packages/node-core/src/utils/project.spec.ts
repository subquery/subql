// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {range} from 'lodash';
import {bypassBlocksValidator} from './project';

describe('bypass logic', () => {
  it('filter out bypassBlocks', () => {
    const currentBatchBlocks = range(1, 10);
    const bypassBlocks = [2, 3, 9, 5];
    const result = bypassBlocksValidator(bypassBlocks, currentBatchBlocks);

    expect(result).toEqual([1, 4, 6, 7, 8]);
  });
});
