// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {uniq} from 'lodash';
import {IBlock} from './types';

export function getBlockHeight<B>(block: number | IBlock<B>): number {
  if (typeof block === 'number') {
    return block;
  }
  return block.getHeader().height;
}

export function mergeNumAndBlocks<FB>(
  numberBlocks: number[],
  batchBlocks: (IBlock<FB> | number)[]
): (number | IBlock<FB>)[] {
  let uniqueNumbers: number[] = uniq(numberBlocks);
  const uniqueBObjects: (IBlock<FB> | number)[] = [];
  // filter out modulo blocks that already exist in fat blocks
  for (const item of batchBlocks) {
    const height = getBlockHeight(item);
    if (!uniqueBObjects.some((b) => getBlockHeight(b) === height)) {
      uniqueBObjects.push(item);
      uniqueNumbers = uniqueNumbers.filter((un) => un !== height);
    }
  }
  // merge and order
  const combinedArray: (number | IBlock<FB>)[] = [...uniqueNumbers, ...uniqueBObjects].sort((a, b) => {
    const numA = typeof a === 'number' ? a : getBlockHeight(a);
    const numB = typeof b === 'number' ? b : getBlockHeight(b);
    return numA - numB;
  });

  return combinedArray;
}

export function mergeNumAndBlocksToNums<FB>(
  firstBlocks: (number | IBlock<FB>)[],
  secondBlocks: (number | IBlock<FB>)[]
): number[] {
  const combinedArray: (number | IBlock<FB>)[] = [...firstBlocks, ...secondBlocks];
  const uniqueNumbersSet = new Set<number>();
  for (const item of combinedArray) {
    if (typeof item === 'number') {
      uniqueNumbersSet.add(item);
    } else {
      uniqueNumbersSet.add(getBlockHeight(item));
    }
  }
  const uniqueNumbersArray: number[] = Array.from(uniqueNumbersSet);
  const sortedArray: number[] = uniqueNumbersArray.sort((a, b) => a - b);
  return sortedArray;
}
