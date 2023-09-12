// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {AutoQueue} from './autoQueue';

describe('AutoQueue', () => {
  it('resovles promises in the order they are pushed', async () => {
    const autoQueue = new AutoQueue<number>(10, 5);
    const results: number[] = [];

    const tasks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => async () => {
      const randomTime = Math.floor(Math.random() * 1000);
      await new Promise((resolve) => setTimeout(resolve, randomTime));

      return v;
    });

    await Promise.all(
      tasks.map(async (t) => {
        const r = await autoQueue.put(t);

        results.push(r);
      })
    );

    expect(results).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('doesnt resolve tasks if flush is called', async () => {
    const autoQueue = new AutoQueue<number>(10, 2);
    const results: number[] = [];

    const tasks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      return v;
    });

    tasks.map((t) => {
      void autoQueue.put(t).then((r) => {
        results.push(r);
      });
    });

    // Wait for some tasks to complete
    await new Promise((resolve) => setTimeout(resolve, 110));

    autoQueue.flush();

    expect(autoQueue.size).toBe(0);

    // Wait for any other tasks to be completed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(results).toEqual([1, 2]);
  });

  it('has a cap on the number of out of order tasks', async () => {
    const autoQueue = new AutoQueue<number>(10, 2, 0.2);
    const results: number[] = [];

    const tasks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => async () => {
      // Set a large timeout for the first task to simulate blocking
      const randomTime = v === 1 ? 400 : 100;
      await new Promise((resolve) => setTimeout(resolve, randomTime));

      return v;
    });

    await expect(
      Promise.all(
        tasks.map(async (t) => {
          const r = await autoQueue.put(t);

          results.push(r);
        })
      )
    ).rejects.toEqual(new Error('timeout'));
  });

  it('can adjust the parallelism while running', async () => {
    const autoQueue = new AutoQueue<number>(10, 2);
    const results: number[] = [];

    const tasks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      return v;
    });

    const start1 = new Date();
    await Promise.all(
      tasks.map(async (t) => {
        const r = await autoQueue.put(t);
        results.push(r);
      })
    );

    const end1 = new Date();
    expect(end1.getTime() - start1.getTime()).toBeGreaterThanOrEqual(500);

    // Update the concurrency, the next batch should complete much quicker
    autoQueue.concurrency = 5;

    const tasks2 = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((v) => async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      return v;
    });

    const start2 = new Date();
    await Promise.all(
      tasks2.map(async (t) => {
        const r = await autoQueue.put(t);
        results.push(r);
      })
    );
    const end2 = new Date();
    expect(end2.getTime() - start2.getTime()).toBeLessThanOrEqual(300);
  });
});
