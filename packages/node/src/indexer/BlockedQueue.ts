// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { delay } from '../utils/promise';

export class BlockedQueue<T> {
  private _queue: T[] = [];
  private _maxSize: number;

  constructor(size: number) {
    this._maxSize = size;
  }

  get size(): number {
    return this._queue.length;
  }

  put(item: T): void {
    if (this._queue.length >= this._maxSize) {
      throw new Error('BlockedQueue exceed max size');
    }
    this._queue.push(item);
  }

  async take(): Promise<T> {
    while (!this.size) {
      await delay(0.1);
    }
    return this._queue.shift();
  }
}
