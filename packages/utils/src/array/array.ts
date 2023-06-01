// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {uniqWith, isEqual} from 'lodash';

// Find duplicate string array in arrays
// Only sorted unique string array will be return
export function findDuplicateStringArray(arrays: string[][]): string[][] {
  const sortedArrays = arrays.map((arr) => arr.sort().join(''));
  const duplicateArray = [];
  for (let i = 0; i < sortedArrays.length; i++) {
    if (sortedArrays.indexOf(sortedArrays[i]) !== sortedArrays.lastIndexOf(sortedArrays[i])) {
      duplicateArray.push(arrays[i]);
    }
  }
  return uniqWith(duplicateArray, isEqual);
}
