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
  (newbenchmarkService as any).currentProcessingTimestamp = 1208163;
  (newbenchmarkService as any).lastRegisteredHeight = 1208163;
  (newbenchmarkService as any).lastRegisteredTimestamp = 1208163;

  it('handle bps when fully synced', async () => {
    // targetHeight === currentProcessingHeight
    await newbenchmarkService.benchmark();
    await delay(30);
  });

  it('Nan bps', async () => {
    // targetHeight !== currentProcessingHeight
    // BPS === '0'
    // estimate time should display 'unknown'

    (newbenchmarkService as any).currentProcessingHeight = 1208161;
    (newbenchmarkService as any).targetHeight = 1208168;
    (newbenchmarkService as any).currentProcessingTimestamp = 1208163;
    (newbenchmarkService as any).lastRegisteredHeight = 1208163;
    (newbenchmarkService as any).lastRegisteredTimestamp = 1208163;
    // (newbenchmarkService as any).blockPerSecond = 'ABC';

    await newbenchmarkService.benchmark();
    await delay(30);
  });
});
