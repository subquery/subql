// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { delay } from '../utils/promise';
import { BenchmarkService } from './benchmark.service';

jest.setTimeout(90000);
describe('Benchmark service', () => {
  it('Handle bps when fully synced', async () => {
    const newbenchmarkService = new BenchmarkService();

    (newbenchmarkService as any).currentProcessingHeight = 1208163;
    (newbenchmarkService as any).targetHeight = 1208163;
    (newbenchmarkService as any).lastRegisteredHeight = 1208163;
    (newbenchmarkService as any).lastRegisteredTimestamp = 10000;
    (newbenchmarkService as any).currentProcessingTimestamp = 10000;

    await newbenchmarkService.benchmark();
    await delay(20);
  });

  it('Connection dropped', async () => {
    const newbenchmarkService = new BenchmarkService();

    (newbenchmarkService as any).currentProcessingHeight = 1209000;
    (newbenchmarkService as any).targetHeight = 1209000;
    (newbenchmarkService as any).lastRegisteredHeight = 1208162;
    (newbenchmarkService as any).currentProcessingTimestamp = 10000;
    (newbenchmarkService as any).lastRegisteredTimestamp = 10000;

    await newbenchmarkService.benchmark();
    await delay(20);
  });

  it('Handle normal', async () => {
    const newbenchmarkService = new BenchmarkService();

    (newbenchmarkService as any).currentProcessingHeight = 1208163;
    (newbenchmarkService as any).targetHeight = 1209163;
    (newbenchmarkService as any).lastRegisteredHeight = 1208162;
    (newbenchmarkService as any).currentProcessingTimestamp = 15000;
    (newbenchmarkService as any).lastRegisteredTimestamp = 10000;

    await newbenchmarkService.benchmark();
    await delay(20);
  });
});
