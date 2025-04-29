// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getLogger} from '../../logger';
import {AutoQueue, Task} from './autoQueue';

const median = (arr: number[]): number => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const MAX_SIZES = 1000;
const MIN_SIZES = 5;

const logger = getLogger('RampQueue');

/**
 * The ramp queue is an extension of the AutoQueue which dynamically adjusts the concurrency based on the getSize function.
 * It will start at concurrency 1 and ramp up to the max concurrency unless there is a large jump above the median size then it will decrease.
 * */
export class RampQueue<T> extends AutoQueue<T> {
  #maxConcurrency: number;
  #sizes: number[] = [];
  #totalItems = 0;

  constructor(
    private getSize: (data: T) => number,
    concurrency: number,
    capacity?: number,
    timeout?: number,
    name?: string
  ) {
    super(capacity, 1, timeout, name);
    this.#maxConcurrency = concurrency;
  }

  async put(item: Task<T>): Promise<T> {
    return this.putMany([item])[0];
  }

  putMany(tasks: Task<T>[]): Promise<T>[] {
    return super.putMany(tasks).map((r) =>
      r.then((d) => {
        this.adjustConcurrency(d);
        return d;
      })
    );
  }

  private setConcurrency(newConcurrency: number) {
    const clamped = Math.max(1, Math.min(Math.floor(newConcurrency), this.#maxConcurrency));
    if (clamped > this.concurrency) {
      logger.debug(`${this.name} increased concurrency to ${clamped}`);
    } else if (clamped < this.concurrency) {
      logger.debug(`${this.name} decreased concurrency to ${clamped}`);
    }
    this.concurrency = clamped;
  }

  private adjustConcurrency(data: T): void {
    try {
      const m = median(this.#sizes);
      const size = this.getSize(data);

      this.addSize(size);

      // Not enough data to construct a median
      if (this.#sizes.length < MIN_SIZES) {
        return;
      }

      if (size > m * 2) {
        // Inverse of the size compared to the median. E.g if a block is 5x as big as the median then the batch size should be 1/5 of the max
        const multiplier = m / size;
        this.setConcurrency(this.#maxConcurrency * multiplier);
      } else if (this.#totalItems % MIN_SIZES === 0) {
        // Increase by 10% of max
        this.setConcurrency(this.concurrency + Math.floor(this.#maxConcurrency / 10));
      }
    } catch (e) {
      console.log('Failed to adjust concurrency', e);
    }
  }

  private addSize(size: number): void {
    if (this.#sizes.length >= MAX_SIZES) {
      this.#sizes.shift();
    }
    this.#totalItems++;
    this.#sizes.push(size);
  }
}
