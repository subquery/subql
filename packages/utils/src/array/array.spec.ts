// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {findDuplicateStringArray} from './array';

describe('Array util', () => {
  it('findDuplicateStringArray', () => {
    const arrays = [
      ['1', '2', '3'],
      ['3', '1', '2'],
      ['apple', 'banana', 'orange'],
      ['orange', 'apple', 'banana'],
      ['grape', 'melon', 'kiwi'], //this is unique
    ];
    expect(findDuplicateStringArray(arrays)).toStrictEqual([
      ['1', '2', '3'],
      ['apple', 'banana', 'orange'],
    ]);
  });
});
