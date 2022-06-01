// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import { BenchmarkService } from './benchmark.service';

jest.setTimeout(90000);
describe('Benchmark service', () => {
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    const logger = getLogger('benchmark');
    loggerSpy = jest.spyOn(logger, 'info');
  });

  it('Handle bps when fully synced', async () => {
    const newbenchmarkService = new BenchmarkService();

    (newbenchmarkService as any).currentProcessingHeight = 1208163;
    (newbenchmarkService as any).targetHeight = 1208163;
    (newbenchmarkService as any).lastRegisteredHeight = 1208163;
    (newbenchmarkService as any).lastRegisteredTimestamp = 10000;
    (newbenchmarkService as any).currentProcessingTimestamp = 10000;

    await newbenchmarkService.benchmark();
    await delay(20);
    expect(loggerSpy).toHaveBeenCalledWith(
      'Fully synced, waiting for new blocks',
    );
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
    expect(loggerSpy).toHaveBeenCalledWith(
      '0.00 bps, target: #1209000, current: #1209000, estimate time: unknown',
    );
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
    expect(loggerSpy).toHaveBeenCalledWith(
      '0.20 bps, target: #1209163, current: #1208163, estimate time: 0 days 01 hours 23 mins',
    );
  });
});
