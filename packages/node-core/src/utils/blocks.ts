// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {chunk, flatten, isNumber, range, uniq, without} from 'lodash';
import {getBlockHeight} from '../indexer/dictionary';
import {IBlock} from '../indexer/types';

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
