// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { range } from 'lodash';
import { delay } from '../utils/promise';
import { AutoQueue } from './BlockedQueue';

describe('BlockedQueue', () => {
  it('first in and first out', async () => {
    const queue = new AutoQueue<number>(10);
    const res: number[] = [];

    const sequence = range(0, 10);
    const tasks = sequence.map((i) => {
      return queue.put(
        () =>
          new Promise((resolve) => {
            res.push(i);
            resolve(i);
          }),
      );
    });

    await Promise.all(tasks);

    expect(res).toEqual(sequence);
  });

  it('throw error when put items more than maxSize', () => {
    const size = 10;
    const queue = new AutoQueue<void>(size);
    const sequence = range(0, size).map(() => () => delay(0.1));
    for (const i of sequence) {
      void queue.put(i);
    }
    expect(() => queue.put(() => delay(0.1))).toThrow('Queue exceeds max size');
  });

  it('throw error when putMany items more than maxSize', () => {
    const size = 10;
    const queue = new AutoQueue<number>(size);
    const sequence = range(0, size + 1).map((n) => () => n);
    expect(() => queue.putMany(sequence)).toThrow(`Queue exceeds max size`);
  });
});
