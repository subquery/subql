// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { BlockHash } from '@polkadot/types/interfaces';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../configure/SubqueryProject';
import { delay } from '../utils/promise';
import { ApiService } from './api.service';
import { BenchmarkService } from './benchmark.service';

jest.setTimeout(90000);
describe('Benchmark service', () => {
  let app: INestApplication;

  afterEach(async () => {
    return app?.close();
  });

  const newbenchmarkService = new BenchmarkService();

  (newbenchmarkService as any).currentProcessingHeight = 1208163;
  (newbenchmarkService as any).targetHeight = 1208163;
  (newbenchmarkService as any).lastRegisteredHeight = 1208163;
  (newbenchmarkService as any).lastRegisteredTimestamp = 10000;
  (newbenchmarkService as any).currentProcessingTimestamp = 10000;

  it('handle bps when fully synced', async () => {
    await newbenchmarkService.benchmark();
    await delay(30);
  });

  it('Connection dropped', async () => {
    // targetHeight !== currentProcessingHeight
    // BPS === '0'
    // estimate time should display 'unknown'
    // no changes in current
    (newbenchmarkService as any).currentProcessingHeight = 1209000;
    (newbenchmarkService as any).targetHeight = 1209000;
    (newbenchmarkService as any).lastRegisteredHeight = 1208162;
    (newbenchmarkService as any).currentProcessingTimestamp = 10000;
    (newbenchmarkService as any).lastRegisteredTimestamp = 10000;
    // (newbenchmarkService as any).blockPerSecond = 'ABC';

    await newbenchmarkService.benchmark();
    await delay(30);
  });

  it('Handle normal', async () => {
    (newbenchmarkService as any).currentProcessingHeight = 1208163;
    (newbenchmarkService as any).targetHeight = 1209163;
    (newbenchmarkService as any).lastRegisteredHeight = 1208162;
    (newbenchmarkService as any).currentProcessingTimestamp = 15000;
    (newbenchmarkService as any).lastRegisteredTimestamp = 10000;

    await newbenchmarkService.benchmark();
    await delay(30);
  });
});
