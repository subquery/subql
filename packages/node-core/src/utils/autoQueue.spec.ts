// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {AutoQueue} from './autoQueue';
import {delay} from './promise';

describe('Auto Queue', () => {
  it('create and flush AutoQueue', () => {
    const newQ = new AutoQueue<void>(5);

    const task1 = () => delay(5);
    const task2 = () => delay(1);
    const task3 = () => delay(10);

    newQ.put(task1);
    newQ.put(task2);
    newQ.put(task3);

    expect(newQ.size).toEqual(3);

    newQ.flush();
    // expect queue should be empty，this not including ongoing processing task
    expect(newQ.queueSize).toEqual(0);
  });
});
