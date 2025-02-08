// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export interface IQueue {
  size: number;
  capacity: number | undefined;
  freeSpace: number | undefined;

  flush(): void;
}

export class Queue<T> implements IQueue {
  protected items: T[] = [];
  private _capacity?: number;

  constructor(capacity?: number) {
    this._capacity = capacity;
  }

  get size(): number {
    return this.items.length;
  }

  get capacity(): number | undefined {
    return this._capacity;
  }

  get freeSpace(): number | undefined {
    if (!this._capacity) return undefined;

    return this._capacity - this.size;
  }

  put(item: T): void {
    this.putMany([item]);
  }

  putMany(items: T[]): void {
    if (this.freeSpace && items.length > this.freeSpace) {
      throw new Error('Queue exceeds max size');
    }
    this.items.push(...items);
  }

  peek(): T | undefined {
    return this.items[0];
  }

  take(): T | undefined {
    return this.items.shift();
  }

  takeMany(size: number): T[] {
    const sizeCapped = Math.min(this.size, size);

    const result = this.items.slice(0, sizeCapped);
    this.items = this.items.slice(sizeCapped);

    return result;
  }

  takeAll(): T[] {
    const result = this.items;

    this.items = [];
    return result;
  }

  flush(): void {
    this.takeAll();
  }
}
