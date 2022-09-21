// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';

export class Queue<T> {
  private items: T[] = [];
  private _capacity?: number;

  constructor(capacity?: number) {
    this._capacity = capacity;
  }

  get size(): number {
    return this.items.length;
  }

  get capacity(): number {
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
    if (this.capacity && items.length > this.freeSpace) {
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

type Task<T> = () => Promise<T> | T;

type Action<T> = {
  task: Task<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
};

export class AutoQueue<T> {
  private pendingPromise = false;
  private queue: Queue<Action<T>>;
  private _abort = false;
  private processingTasks = 0;

  private eventEmitter = new EventEmitter2();

  constructor(capacity?: number, private concurrency = 1) {
    this.queue = new Queue<Action<T>>(capacity);
  }

  get size(): number {
    return this.queue.size + this.processingTasks;
  }

  get capacity(): number {
    return this.queue.capacity;
  }

  get freeSpace(): number | undefined {
    return this.queue.freeSpace;
  }

  /*
   * We don't want this function to be async
   * If it is async it will return a promise that throws rather than throwing the function
   */
  async put(item: Task<T>): Promise<T> {
    return this.putMany([item])[0];
  }

  putMany(tasks: Array<Task<T>>): Promise<T>[] {
    if (this.capacity && tasks.length > this.freeSpace) {
      throw new Error('Queue exceeds max size');
    }

    if (this._abort) {
      throw new Error('Queue has been aborted');
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

  private async take(): Promise<void> {
    if (this.pendingPromise) return;
    if (this._abort) {
      // Reset so it can be restarted
      // this._abort = false;
      return;
    }

    while (!this._abort) {
      const actions = this.queue.takeMany(this.concurrency);

      if (!actions.length) break;
      this.processingTasks += actions.length;

      this.eventEmitter.emit('size', this.queue.size);

      this.pendingPromise = true;

      await Promise.all(
        actions.map(async (action) => {
          try {
            const payload = await action.task();
            this.processingTasks -= 1;
            action.resolve(payload);
          } catch (e) {
            action.reject(e);
          }
        }),
      );
    }
    this.pendingPromise = false;
  }

  flush(): void {
    // Empty the queue
    // TODO do we need to reject all promises?
    this.queue.takeAll();
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
