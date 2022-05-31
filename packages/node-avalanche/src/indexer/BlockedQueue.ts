// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { delay } from '@subql/common-node/utils';

export class BlockedQueue<T> {
  private _queue: T[] = [];
  private _maxSize: number;

  constructor(size: number) {
    this._maxSize = size;
  }

  get size(): number {
    return this._queue.length;
  }

  get freeSize(): number {
    return this._maxSize - this._queue.length;
  }

  put(item: T): void {
    if (this._queue.length >= this._maxSize) {
      throw new Error('BlockedQueue exceed max size');
    }
    this._queue.push(item);
  }

  putAll(items: T[]): void {
    if (this._queue.length + items.length > this._maxSize) {
      throw new Error('BlockedQueue exceed max size');
    }
    this._queue.push(...items);
  }

  async take(): Promise<T> {
    while (!this.size) {
      await delay(0.1);
    }
    return this._queue.shift();
  }
  async takeAll(max?: number): Promise<T[]> {
    while (!this.size) {
      await delay(0.1);
    }
    let result;
    if (max) {
      result = this._queue.slice(0, max);
      this._queue = this._queue.slice(max);
    } else {
      result = this._queue;
      this._queue = [];
    }
    return result;
  }
}
