// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';

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

type Task<T> = () => Promise<T> | T;

type Action<T> = {
  index: number;
  task: Task<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
};

/*
 * AutoQueue processes asnyc funcitons in order with a level of concurrency
 * When concurrency is used it will be running many functions concurrently,
 * but the promisies for this will still resolve in order they were inserted in the queue
 */
export class AutoQueue<T> implements IQueue {
  private pendingPromise = false;
  private queue: Queue<Action<T>>;
  private _abort = false;
  // private processingTasks = 0;

  private eventEmitter = new EventEmitter2();

  private runningTasks: Promise<void | T>[] = [];

  // Completed tasks that have completed before earlier tasks
  private outOfOrderTasks: Record<number, {action: Action<T>; result?: T; error?: unknown}> = {};
  // Next index assigned to a task when pushing to the queue
  private nextIndex = 0;
  // Next task to resolve, used to order the outOfOrderTasks
  private nextTask = 0;

  constructor(capacity?: number, private concurrency = 1) {
    this.queue = new Queue<Action<T>>(capacity);
  }

  get size(): number {
    return this.queue.size + this.runningTasks.length;
  }

  get capacity(): number | undefined {
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
    if (this.freeSpace && tasks.length > this.freeSpace) {
      throw new Error('Queue exceeds max size');
    }

    if (this._abort) {
      throw new Error('Queue has been aborted');
    }

    return tasks.map((task, index) => {
      return new Promise((resolve, reject) => {
        this.queue.put({task, resolve, reject, index: this.nextIndex++});
        if (tasks.length - 1 === index) {
          void this.take();
        }
      });
    });
  }

  private processOutOfOrderTasks() {
    const next = this.outOfOrderTasks[this.nextTask];

    if (!next) return;

    const {action: nextAction, error, result: nextResult} = next;
    if (nextResult) {
      nextAction.resolve(nextResult);
    } else if (error) {
      nextAction.reject(error);
    }
    delete this.outOfOrderTasks[this.nextTask];
    this.nextTask++;
    // Check if next task ready
    this.processOutOfOrderTasks();
  }

  private async take(): Promise<void> {
    if (this.pendingPromise) return;
    if (this._abort) {
      return;
    }

    while (!this._abort) {
      const action = this.queue.take();

      // No more actions to start, take will be called again when new items are pushed
      if (!action) break;

      this.pendingPromise = true;

      const p = Promise.resolve(action.task())
        .then((result) => {
          this.outOfOrderTasks[action.index] = {action, result};
        })
        .catch((error) => {
          this.outOfOrderTasks[action.index] = {action, error};
        })
        .finally(() => {
          this.processOutOfOrderTasks();
          const index = this.runningTasks.indexOf(p);
          this.runningTasks.splice(index, 1);
        });

      this.runningTasks.push(p);

      if (this.runningTasks.length >= this.concurrency) {
        // Load up more when any task completes
        await Promise.any(this.runningTasks);
      }
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

  on(evt: 'size', callback: (size: number) => void | Promise<void>): () => void {
    this.eventEmitter.on(evt, callback as (size: number) => void);

    return () => this.eventEmitter.off(evt, callback as (size: number) => void);
  }
}
