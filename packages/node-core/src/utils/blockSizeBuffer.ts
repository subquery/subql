// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Queue } from './autoQueue';

export class BlockSizeBuffer extends Queue<number> {
  constructor(capacity: number) {
    super(capacity);
  }

  putMany(items: number[]): void {
    if (items.length > this.capacity) {
      throw new Error(`Queue out of capacity`);
    }

    if (this.capacity && items.length > this.freeSpace) {
      this.takeMany(items.length);
    }

    this.items.push(...items);
  }

  average() {
    if (this.size === 0) {
      throw new Error('No block sizes to average');
    }

    let sum = 0;
    for (let i = 0; i < this.size; i++) {
      sum += this.items[i];
    }
    return Math.floor(sum / this.capacity);
  }
}
