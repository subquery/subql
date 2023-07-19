// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Queue} from './autoQueue';

export class BlockSizeBuffer extends Queue<number> {
  constructor(capacity: number) {
    super(capacity);
  }

  average(): number {
    if (this.size === 0) {
      throw new Error('No block sizes to average');
    }

    let sum = 0;
    for (let i = 0; i < this.size; i++) {
      sum += this.items[i];
    }

    if (!this.capacity) {
      throw new Error('Capacity is expected to be defined for block size buffer');
    }
    return Math.floor(sum / this.capacity);
  }
}
