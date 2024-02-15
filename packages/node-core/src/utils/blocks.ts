// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IBlock} from '@subql/types-core';
import {flatten, isNumber, range, uniq, without} from 'lodash';
import {getBlockHeight} from '../indexer';

export function cleanedBatchBlocks<FB>(
  bypassBlocks: number[],
  currentBlockBatch: (IBlock<FB> | number)[]
): (IBlock<FB> | number)[] {
  // more efficient to remove large amount numbers
  const filteredNumbers = without(currentBlockBatch, ...transformBypassBlocks(bypassBlocks));
  const filteredBlocks = filteredNumbers.filter((b) => {
    const height = getBlockHeight(b);
    return bypassBlocks.indexOf(height) < 0;
  });
  return filteredBlocks;
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
