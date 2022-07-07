// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { threadId } from 'node:worker_threads';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getLogger, NestLogger } from '../../utils/logger';
import { IndexerManager } from '../indexer.manager';
import { registerWorker } from './worker.builder';
import { WorkerModule } from './worker.module';
import {
  FetchBlockResponse,
  ProcessBlockResponse,
  WorkerService,
  WorkerStatusResponse,
} from './worker.service';

let app: INestApplication;
let workerService: WorkerService;

const logger = getLogger(`worker #${threadId}`);

async function initWorker(): Promise<void> {
  if (app) {
    logger.warn('Worker already initialised');
    return;
  }

  app = await NestFactory.create(WorkerModule, {
    logger: new NestLogger(),
  });

  await app.init();

  const indexerManager = app.get(IndexerManager);
  await indexerManager.start();

  workerService = app.get(WorkerService);
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
async function setCurrentRuntimeVersion(runtimeHex: string): Promise<void> {
  assert(workerService, 'Not initialised');

  return workerService.setCurrentRuntimeVersion(runtimeHex);
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

// Register these functions to be exposed to worker host
registerWorker({
  initWorker,
  fetchBlock,
  processBlock,
  numFetchedBlocks,
  numFetchingBlocks,
  setCurrentRuntimeVersion,
  getStatus,
});

// Export types to be used on the parent
export type InitWorker = typeof initWorker;
export type FetchBlock = typeof fetchBlock;
export type ProcessBlock = typeof processBlock;
export type NumFetchedBlocks = typeof numFetchedBlocks;
export type NumFetchingBlocks = typeof numFetchingBlocks;
export type SetCurrentRuntimeVersion = typeof setCurrentRuntimeVersion;
export type GetWorkerStatus = typeof getStatus;
