// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BackoffError, backoffRetry, delay, timeout} from './promise';

describe('Promise Utils', () => {
  it('utils.promise delay()', async () => {
    const start = new Date();
    await delay(1);
    const millsecDiff = new Date().getTime() - start.getTime();
    expect(millsecDiff).toBeGreaterThanOrEqual(1000);
    expect(millsecDiff).toBeLessThan(1050);
  });

  it('utils.promise timeout()', async () => {
    const firstPromise = (async () => {
      await delay(1);
      return true;
    })();
    await expect(timeout(firstPromise, 2)).resolves.toEqual(true);
    const secondPromise = delay(3);
    await expect(timeout(secondPromise, 2)).rejects.toThrow(/timeout/);
  });

  describe('BackoffRetry', () => {
    it(`doesn't retry with success`, async () => {
      const fn = jest.fn(() => Promise.resolve());
      await backoffRetry(fn, 5);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it(`retries multiple times`, async () => {
      let count = 0;

      const fn = jest.fn(() => {
        if (count < 1) {
          count++;
          return Promise.reject();
        }
        return Promise.resolve();
      });

      await backoffRetry(fn, 5);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it(`throws when reaching the number of retries`, async () => {
      const e = new Error('Test');
      const fn = jest.fn(() => Promise.reject(e));
      await expect(() => backoffRetry(fn, 2)).rejects.toEqual(new BackoffError(e));
    });
  });
});
