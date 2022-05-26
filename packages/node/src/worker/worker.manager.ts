// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import os from 'os';
import path from 'path';
import * as worker from 'worker_threads';
import { ApiPromise } from '@polkadot/api';
import { Vec } from '@polkadot/types';
import { EventRecord, SignedBlock } from '@polkadot/types/interfaces';
import { range } from 'lodash';
import { BlockContent } from '../indexer/types';
import { getLogger } from '../utils/logger';
import { wrapBlock, wrapEvents, wrapExtrinsics } from '../utils/substrate';
import {
  FetchBlockArgs,
  FetchBlockRequest,
  InitRequest,
  Response,
} from './worker';

export class WorkerPool {
  private workers: WorkerManager[] = [];

  private constructor() {
    /* Empty but exists to make private*/
  }

  static async create(
    endpoint: string,
    api: ApiPromise,
    maxWorkers?: number,
  ): Promise<WorkerPool> {
    // Limit max workers to num cpus - 1

    // TODO fix this because docker incorrectly reports this
    const maxCPUs = os.cpus().length - 1;
    maxWorkers = Math.min(maxWorkers ?? maxCPUs, maxCPUs);

    console.log(
      `Max workers: ${maxWorkers}, Num CPU: ${os.cpus().length}, Process id: ${
        process.pid
      }`,
    );

    const pool = new WorkerPool();

    pool.workers = await Promise.all(
      range(0, maxWorkers).map(() => WorkerManager.create(endpoint, api)),
    );

    return pool;
  }

  async fetchBlocks(
    blockArray: number[],
    overallSpecVer?: number,
  ): Promise<BlockContent[]> {
    return Promise.all(
      // Bin requests evenly
      blockArray.map((blockNum, i) =>
        this.workers[i % this.workers.length].fetchBlock(
          blockNum,
          overallSpecVer,
        ),
      ),
    );
  }

  get poolSize(): number {
    return this.workers.length;
  }
}

const logger = getLogger('BlockWorker');

export class WorkerManager {
  private worker: worker.Worker;

  private responseListeners: Record<
    number | string,
    (res: Response<any>) => void
  > = {};

  private constructor(
    private readonly endpoint: string,
    private readonly api: ApiPromise,
  ) {
    this.worker = new worker.Worker(
      path.resolve(__dirname, '../../dist/worker/worker.js'),
    );

    this.worker.on('error', (e) => {
      logger.error(e, 'Worker error');
    });

    this.worker.on('message', (r: Response<any>) => {
      if (this.responseListeners[r.id]) {
        this.responseListeners[r.id](r);
        delete this.responseListeners[r.id];
      }
    });
  }

  private async getResponse<T = any>(id: number | string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.responseListeners[id] = (res: Response<T>) => {
        // TODO handle error
        resolve(res.args);
      };
    });
  }

  static async create(
    endpoint: string,
    api: ApiPromise,
  ): Promise<WorkerManager> {
    const manager = new WorkerManager(endpoint, api);

    const id = 0; // TODO use unique id

    manager.worker.postMessage(<InitRequest>{
      id,
      type: 'init',
      args: { endpoint },
    });

    await manager.getResponse(id);

    return manager;
  }

  async fetchBlock(
    height: number,
    specVersion?: number,
  ): Promise<BlockContent> {
    const id = height; // TODO use unique id

    this.worker.postMessage(<FetchBlockRequest>{
      id,
      type: 'fetchBlock',
      args: { height, specVersion },
    });

    const {
      block: rawBlock,
      blockHash,
      events: rawEvents,
      specVersion: specVersionRes,
    } = await this.getResponse<FetchBlockArgs>(id);

    // Serialise
    // TODO should this use api.at?
    let block: SignedBlock;
    let events: Vec<EventRecord>;

    try {
      const api = await this.api.at(blockHash);
      block = api.registry.createType(
        rawBlock.type,
        rawBlock.data,
      ) as SignedBlock;
      events = api.registry.createType(
        rawEvents.type,
        rawEvents.data,
      ) as Vec<EventRecord>;
    } catch (e) {
      logger.error(e, 'Failed to decode block data');
      throw e;
    }

    const wrappedBlock = wrapBlock(block, events.toArray(), specVersionRes);
    const wrappedExtrinsics = wrapExtrinsics(wrappedBlock, events);
    const wrappedEvents = wrapEvents(wrappedExtrinsics, events, wrappedBlock);

    return {
      block: wrappedBlock,
      extrinsics: wrappedExtrinsics,
      events: wrappedEvents,
    };
  }
}
