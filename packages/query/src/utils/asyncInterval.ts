// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

//improve util method from : https://dev.to/jsmccrumb/asynchronous-setinterval-4j69

const asyncIntervals = [];

const runAsyncInterval = async (cb, interval, intervalIndex) => {
  await cb();
  if (asyncIntervals[intervalIndex].run) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    asyncIntervals[intervalIndex].id = setTimeout(() => runAsyncInterval(cb, interval, intervalIndex), interval);
  }
};

export const setAsyncInterval = (cb, interval) => {
  if (cb && typeof cb === 'function') {
    const intervalIndex = asyncIntervals.length;
    asyncIntervals.push({run: true, id: 0});
    runAsyncInterval(cb, interval, intervalIndex);
    return intervalIndex;
  } else {
    throw new Error('Callback must be a function');
  }
};

const clearAsyncInterval = (intervalIndex) => {
  if (asyncIntervals[intervalIndex].run) {
    clearTimeout(asyncIntervals[intervalIndex].id);
    asyncIntervals[intervalIndex].run = false;
  }
};
