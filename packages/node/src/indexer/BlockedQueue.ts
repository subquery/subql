// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';

export class Queue<T> {
  private items: T[] = [];

  get size(): number {
    return this.items.length;
  }

  put(item: T): void {
    this.putMany([item]);
  }

  putMany(items: T[]): void {
    this.items.push(...items);
  }

  take(): T | undefined {
    return this.items.shift();
  }

  takeAll(): T[] {
    const result = this.items;

    this.items = [];
    return result;
  }
}

type Action<T> = {
  task: () => Promise<T> | T;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
};

export class AutoQueue<T> {
  private pendingPromise = false;
  private queue = new Queue<Action<T>>();
  private _capacity: number;
  private _abort = false;

  private eventEmitter = new EventEmitter2();

  constructor(capacity: number) {
    this._capacity = capacity;
  }

  get size(): number {
    return this.queue.size;
  }

  get capacity(): number {
    return this._capacity;
  }

  get freeSpace(): number {
    return this._capacity - this.queue.size;
  }

  /*
   * We don't want this function to be async
   * If it is async it will return a promise that throws rather than throwing the function
   */
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  put(item: () => T | Promise<T>): Promise<T> {
    return this.putMany([item])[0];
  }

  putMany(tasks: Array<() => T | Promise<T>>): Promise<T>[] {
    if (this.queue.size + tasks.length >= this.capacity) {
      throw new Error('Queue exceeds max size');
    }

    return tasks.map((task, index) => {
      return new Promise((resolve, reject) => {
        this.queue.put({ task, resolve, reject });
        if (tasks.length - 1 === index) {
          void this.take();
        }
      });
    });
  }

  async take(): Promise<void> {
    if (this.pendingPromise) return;
    if (this._abort) {
      // Reset so it can be restarted
      this._abort = false;
      return;
    }

    const action = this.queue.take();

    if (!action) return;

    this.eventEmitter.emit('size', this.queue.size);

    try {
      this.pendingPromise = true;
      const payload = await action.task();

      action.resolve(payload);
    } catch (e) {
      action.reject(e);
    } finally {
      this.pendingPromise = false;
      void this.take();
    }
  }

  abort(): void {
    this._abort = true;
  }

  on(
    evt: 'size',
    callback: (size: number) => void | Promise<void>,
  ): () => void {
    this.eventEmitter.on(evt, callback as (size: number) => void);

    return () => this.eventEmitter.off(evt, callback as (size: number) => void);
  }
}
