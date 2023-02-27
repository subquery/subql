// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { registerWorker, getLogger, NestLogger, waitForHeap } from '@subql/node-core';
import { SpecVersion } from '../dictionary.service';
import { IndexerManager } from '../indexer.manager';
import { WorkerModule } from './worker.module';
import {
  FetchBlockResponse,
  ProcessBlockResponse,
  WorkerService,
  WorkerStatusResponse,
} from './worker.service';
import { getHeapStatistics } from 'v8';
import { DynamicDsService } from '../dynamic-ds.service';
let app: INestApplication;
let workerService: WorkerService;
let dynamicDsService: DynamicDsService;

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
    dynamicDsService = app.get(DynamicDsService);
  } catch (e) {
    console.log('Failed to start worker', e);
    logger.error(e, 'Failed to start worker');
    throw e;
  }
}

function getSpecFromMap(height: number): number | undefined {
  assert(workerService, 'Not initialised');
  return workerService.getSpecFromMap(height);
}

async function fetchBlock(
  height: number,
  specVersion: number,
): Promise<FetchBlockResponse> {
  assert(workerService, 'Not initialised');
  return workerService.fetchBlock(height, specVersion);
}

async function processBlock(height: number): Promise<ProcessBlockResponse> {
  assert(workerService, 'Not initialised');

  const res = await workerService.processBlock(height);

  // Clean up the temp ds records for worker thread instance
  if (res.dynamicDsCreated) {
    const dynamicDsService = app.get(DynamicDsService);
    dynamicDsService.deleteTempDsRecords(height);
  }

  return res;
}

function syncRuntimeService(
  specVersions: SpecVersion[],
  latestFinalizedHeight?: number,
): void {
  assert(workerService, 'Not initialised');
  workerService.syncRuntimeService(specVersions, latestFinalizedHeight);
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

async function waitForWorkerHeap(heapSizeInMB) {
  await waitForHeap(heapSizeInMB);
}

async function reloadDynamicDs(): Promise<void> {
  return dynamicDsService.reloadDynamicDatasources();
}

// Register these functions to be exposed to worker host
registerWorker({
  initWorker,
  fetchBlock,
  processBlock,
  numFetchedBlocks,
  numFetchingBlocks,
  getStatus,
  syncRuntimeService,
  getSpecFromMap,
  getMemoryLeft,
  waitForWorkerHeap,
  reloadDynamicDs,
});

// Export types to be used on the parent
export type InitWorker = typeof initWorker;
export type FetchBlock = typeof fetchBlock;
export type ProcessBlock = typeof processBlock;
export type NumFetchedBlocks = typeof numFetchedBlocks;
export type NumFetchingBlocks = typeof numFetchingBlocks;
export type GetWorkerStatus = typeof getStatus;
export type SyncRuntimeService = typeof syncRuntimeService;
export type GetSpecFromMap = typeof getSpecFromMap;
export type GetMemoryLeft = typeof getMemoryLeft;
export type WaitForWorkerHeap = typeof waitForWorkerHeap;
export type ReloadDynamicDs = typeof reloadDynamicDs;

process.on('uncaughtException', (e) => {
  logger.error(e, 'Uncaught Exception');
  throw e;
});
