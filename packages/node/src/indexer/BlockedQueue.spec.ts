// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { range } from 'lodash';
import { BlockedQueue } from './BlockedQueue';

describe('BlockedQueue', () => {
  it('first in and first out', async () => {
    const queue = new BlockedQueue<number>(10);
    const sequence = range(0, 10);
    for (const i of sequence) {
      queue.put(i);
    }
    for (const i of sequence) {
      await expect(queue.take()).resolves.toEqual(i);
    }
  });

  it('throw error when put items more than maxSize', () => {
    const size = 10;
    const queue = new BlockedQueue<number>(10);
    const sequence = range(0, 10);
    for (const i of sequence) {
      queue.put(i);
    }
    expect(() => queue.put(0)).toThrow('BlockedQueue exceed max size');
  });

  it('block take() when queue is empty', async () => {
    const queue = new BlockedQueue<number>(10);
    const delay = 1000;
    const startTs = new Date();
    let msecondTooks: number;
    const takePromise = queue
      .take()
      .then(() => (msecondTooks = new Date().getTime() - startTs.getTime()));
    setTimeout(() => queue.put(0), delay);
    await takePromise;
    expect(msecondTooks).toBeGreaterThanOrEqual(delay);
  });

  it('block takeAll() with batchsize', async () => {
    const queue = new BlockedQueue<number>(10);
    const sequence = range(0, 10);
    for (const i of sequence) {
      queue.put(i);
    }
    //Take first batch
    await expect(queue.takeAll(6)).resolves.toEqual([0, 1, 2, 3, 4, 5]);
    //Take rest of it
    await expect(queue.takeAll(6)).resolves.toEqual([6, 7, 8, 9]);
  });
});
