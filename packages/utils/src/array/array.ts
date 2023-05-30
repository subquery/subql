// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Find duplicate string array in arrays
// const arrays = [
//   ['apple', 'banana', 'orange'],
//   ['orange', 'apple', 'banana'],
//   ['grape', 'melon', 'kiwi'],
//   ['kiwi', 'grape', 'melon'],
//   ['apple', 'banana', 'orange']
// ];

export function findDuplicateStringArray(arrays: string[][]) {
  const sortedArrays = arrays.map((arr) => arr.sort().join(''));
  // const uniqueArrays = new Set(sortedArrays);
  const duplicateArray = [];
  for (let i = 0; i < sortedArrays.length; i++) {
    if (sortedArrays.indexOf(sortedArrays[i]) !== sortedArrays.lastIndexOf(sortedArrays[i])) {
      duplicateArray.push(arrays[i]);
    }
  }
  return duplicateArray;
}
