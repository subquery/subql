// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

//improve util method from : https://dev.to/jsmccrumb/asynchronous-setinterval-4j69

const asyncIntervals: {run: boolean; id: number | NodeJS.Timeout}[] = [];

const runAsyncInterval = async (cb: () => any, interval: number, intervalIndex: number) => {
  await cb();
  if (asyncIntervals[intervalIndex].run) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    asyncIntervals[intervalIndex].id = setTimeout(() => runAsyncInterval(cb, interval, intervalIndex), interval);
  }
};

export const setAsyncInterval = (cb: () => any, interval: number) => {
  if (cb && typeof cb === 'function') {
    const intervalIndex = asyncIntervals.length;
    asyncIntervals.push({run: true, id: 0});
    void runAsyncInterval(cb, interval, intervalIndex);
    return intervalIndex;
  } else {
    throw new Error('Callback must be a function');
  }
};
