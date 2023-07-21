// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// initlogger and yargs must be imported before all other imports
// making sure logger is defined before its called
// eslint-disable-next-line import/order
import { initLogger } from '@subql/node-core/logger';
// eslint-disable-next-line import/order
import { yargsOptions } from '../../yargs';

const { argv } = yargsOptions;

initLogger(
  argv.debug,
  argv.outputFmt as 'json' | 'colored',
  argv.logLevel as string | undefined,
);

import assert from 'assert';
import { threadId } from 'node:worker_threads';
import { getHeapStatistics } from 'v8';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  waitForBatchSize,
  WorkerHost,
  getLogger,
  NestLogger,
  hostStoreKeys,
  HostStore,
  hostDynamicDsKeys,
  HostDynamicDS,
  ProcessBlockResponse,
} from '@subql/node-core';
import { SubqlProjectDs } from '../../configure/SubqueryProject';
import { IndexerManager } from '../indexer.manager';
import { WorkerModule } from './worker.module';
import {
  FetchBlockResponse,
  WorkerService,
  WorkerStatusResponse,
} from './worker.service';
import {
  HostUnfinalizedBlocks,
  hostUnfinalizedBlocksKeys,
} from './worker.unfinalizedBlocks.service';
let app: INestApplication;
let workerService: WorkerService;

const logger = getLogger(`worker #${threadId}`);

async function initWorker(): Promise<void> {
  try {
    if (app) {
      logger.warn('Worker already initialised');
      return;
    }

    app = await NestFactory.create(WorkerModule, {
      logger: new NestLogger(), // TIP: If the worker is crashing comment out this line for better logging
    });

    await app.init();

    const indexerManager = app.get(IndexerManager);
    // Initialise async services, we do this here rather than in factories so we can capture one off events
    await indexerManager.start();

    workerService = app.get(WorkerService);
  } catch (e) {
    console.log('Failed to start worker', e);
    logger.error(e, 'Failed to start worker');
    throw e;
  }
}

async function fetchBlock(height: number): Promise<FetchBlockResponse> {
  assert(workerService, 'Not initialised');
  return workerService.fetchBlock(height);
}

async function processBlock(height: number): Promise<ProcessBlockResponse> {
  assert(workerService, 'Not initialised');

  return workerService.processBlock(height);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function numFetchedBlocks(): Promise<number> {
  return workerService.numFetchedBlocks;
}

// eslint-disable-next-line @typescript-eslint/require-await
async function numFetchingBlocks(): Promise<number> {
  return workerService.numFetchingBlocks;
}

// eslint-disable-next-line @typescript-eslint/require-await
async function getStatus(): Promise<WorkerStatusResponse> {
  return {
    threadId,
    fetchedBlocks: workerService.numFetchedBlocks,
    toFetchBlocks: workerService.numFetchingBlocks,
    isIndexing: workerService.isIndexing,
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
async function getMemoryLeft(): Promise<number> {
  const totalHeap = getHeapStatistics().heap_size_limit;
  const heapUsed = process.memoryUsage().heapUsed;

  return totalHeap - heapUsed;
}

async function waitForWorkerBatchSize(heapSizeInBytes: number): Promise<void> {
  await waitForBatchSize(heapSizeInBytes);
}

// Register these functions to be exposed to worker host
(global as any).host = WorkerHost.create<
  HostStore & HostDynamicDS<SubqlProjectDs> & HostUnfinalizedBlocks,
  IInitIndexerWorker
>(
  [...hostStoreKeys, ...hostDynamicDsKeys, ...hostUnfinalizedBlocksKeys],
  {
    initWorker,
    fetchBlock,
    processBlock,
    numFetchedBlocks,
    numFetchingBlocks,
    getStatus,
    getMemoryLeft,
    waitForWorkerBatchSize,
  },
  logger,
);

// Export types to be used on the parent
type InitWorker = typeof initWorker;
type FetchBlock = typeof fetchBlock;
type ProcessBlock = typeof processBlock;
type NumFetchedBlocks = typeof numFetchedBlocks;
type NumFetchingBlocks = typeof numFetchingBlocks;
type GetWorkerStatus = typeof getStatus;
type GetMemoryLeft = typeof getMemoryLeft;
type WaitForWorkerBatchSize = typeof waitForWorkerBatchSize;

export type IIndexerWorker = {
  processBlock: ProcessBlock;
  fetchBlock: FetchBlock;
  numFetchedBlocks: NumFetchedBlocks;
  numFetchingBlocks: NumFetchingBlocks;
  getStatus: GetWorkerStatus;
  getMemoryLeft: GetMemoryLeft;
  waitForWorkerBatchSize: WaitForWorkerBatchSize;
};

export type IInitIndexerWorker = IIndexerWorker & {
  initWorker: InitWorker;
};

process.on('uncaughtException', (e) => {
  logger.error(e, 'Uncaught Exception');
  throw e;
});
