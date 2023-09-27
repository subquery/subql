// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'node:assert';
import {getHeapStatistics} from 'node:v8';
import {threadId} from 'node:worker_threads';
import {INestApplication} from '@nestjs/common';
import {BaseDataSource} from '@subql/types-core';
import {getLogger} from '../../logger';
import {waitForBatchSize} from '../../utils';
import {ProcessBlockResponse} from '../blockDispatcher';
import {WorkerHost, AsyncMethods} from './worker.builder';
import {HostConnectionPoolState, hostConnectionPoolStateKeys} from './worker.connectionPoolState.manager';
import {HostDynamicDS, hostDynamicDsKeys} from './worker.dynamic-ds.service';
import {BaseWorkerService, WorkerStatusResponse} from './worker.service';
import {HostStore, hostStoreKeys} from './worker.store.service';
import {HostUnfinalizedBlocks, hostUnfinalizedBlocksKeys} from './worker.unfinalizedBlocks.service';

export type DefaultWorkerFunctions<
  ApiConnection /* ApiPromiseConnection*/,
  DS extends BaseDataSource = BaseDataSource
> = HostStore & HostDynamicDS<DS> & HostUnfinalizedBlocks & HostConnectionPoolState<ApiConnection>;

let workerApp: INestApplication;
let workerService: BaseWorkerService<any, any>;

const logger = getLogger(`worker #${threadId}`);

export function initWorkerServices(worker: INestApplication, service: BaseWorkerService<any, any>): void {
  if (workerApp) {
    logger.warn('Worker already initialised');
    return;
  }
  workerApp = worker;
  workerService = service;
}

export function getWorkerApp(): INestApplication {
  assert(workerApp, 'Worker Not initialised');
  return workerApp;
}

export function getWorkerService<S extends BaseWorkerService<any, any>>(): S {
  assert(workerService, 'Worker Not initialised');
  return workerService as S;
}
// eslint-disable-next-line @typescript-eslint/require-await
async function getBlocksLoaded(): Promise<number> {
  return workerService.numFetchedBlocks + workerService.numFetchingBlocks;
}

// eslint-disable-next-line @typescript-eslint/require-await
async function getMemoryLeft(): Promise<number> {
  const totalHeap = getHeapStatistics().heap_size_limit;
  const heapUsed = process.memoryUsage().heapUsed;

  return totalHeap - heapUsed;
}

// eslint-disable-next-line @typescript-eslint/require-await
async function getStatus(): Promise<WorkerStatusResponse> {
  assert(workerService, 'Worker Not initialised');
  return {
    threadId,
    fetchedBlocks: workerService.numFetchedBlocks,
    toFetchBlocks: workerService.numFetchingBlocks,
    isIndexing: workerService.isIndexing,
  };
}

async function fetchBlock(height: number, specVersion: number): Promise<unknown /*FetchBlockResponse*/> {
  assert(workerService, 'Worker Not initialised');
  return workerService.fetchBlock(height, {specVersion});
}

// eslint-disable-next-line @typescript-eslint/require-await
async function processBlock(height: number): Promise<ProcessBlockResponse> {
  assert(workerService, 'Worker Not initialised');
  return workerService.processBlock(height);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function numFetchedBlocks(): Promise<number> {
  assert(workerService, 'Worker Not initialised');
  return workerService.numFetchedBlocks;
}

// eslint-disable-next-line @typescript-eslint/require-await
async function numFetchingBlocks(): Promise<number> {
  assert(workerService, 'Worker Not initialised');
  return workerService.numFetchingBlocks;
}

async function waitForWorkerBatchSize(heapSizeInBytes: number): Promise<void> {
  await waitForBatchSize(heapSizeInBytes);
}

// Export types to be used on the parent
type FetchBlock = typeof fetchBlock;
type ProcessBlock = typeof processBlock;
type NumFetchedBlocks = typeof numFetchedBlocks;
type NumFetchingBlocks = typeof numFetchingBlocks;
type GetWorkerStatus = typeof getStatus;
type GetMemoryLeft = typeof getMemoryLeft;
type GetBlocksLoaded = typeof getBlocksLoaded;
type WaitForWorkerBatchSize = typeof waitForWorkerBatchSize;

export type IBaseIndexerWorker = {
  processBlock: ProcessBlock;
  fetchBlock: FetchBlock;
  numFetchedBlocks: NumFetchedBlocks;
  numFetchingBlocks: NumFetchingBlocks;
  getStatus: GetWorkerStatus;
  getMemoryLeft: GetMemoryLeft;
  getBlocksLoaded: GetBlocksLoaded;
  waitForWorkerBatchSize: WaitForWorkerBatchSize;
};

export const baseWorkerFunctions: (keyof IBaseIndexerWorker)[] = [
  'processBlock',
  'fetchBlock',
  'numFetchedBlocks',
  'numFetchingBlocks',
  'getStatus',
  'getMemoryLeft',
  'getBlocksLoaded',
  'waitForWorkerBatchSize',
];

export function createWorkerHost<
  T extends AsyncMethods,
  H extends AsyncMethods & {initWorker: (height?: number) => Promise<void>},
  ApiConnection /* ApiPromiseConnection*/,
  DS extends BaseDataSource = BaseDataSource
>(extraWorkerFns: (keyof T)[], extraHostFns: H): WorkerHost<DefaultWorkerFunctions<ApiConnection, DS> & T> {
  // Register these functions to be exposed to worker host
  return WorkerHost.create<DefaultWorkerFunctions<ApiConnection, DS> & T, IBaseIndexerWorker & H>(
    [
      // Have this first to not override the default functions
      ...extraWorkerFns,
      ...hostStoreKeys,
      ...hostDynamicDsKeys,
      ...hostUnfinalizedBlocksKeys,
      ...hostConnectionPoolStateKeys,
    ],
    {
      // Have this first to not override the default functions
      ...extraHostFns,
      fetchBlock,
      processBlock,
      numFetchedBlocks,
      numFetchingBlocks,
      getStatus,
      getMemoryLeft,
      getBlocksLoaded,
      waitForWorkerBatchSize,
    },
    logger
  );
}

process.on('uncaughtException', (e) => {
  logger.error(e, 'Uncaught Exception');
  throw e;
});
