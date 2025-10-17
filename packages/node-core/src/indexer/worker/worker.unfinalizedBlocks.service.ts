// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'node:worker_threads';
import {Injectable} from '@nestjs/common';
import {Header, IBlock, IUnfinalizedBlocksService} from '../../indexer';

export type HostUnfinalizedBlocks = {
  unfinalizedBlocksProcess: (header: Header | undefined) => Promise<Header | undefined>;
};

export const hostUnfinalizedBlocksKeys: (keyof HostUnfinalizedBlocks)[] = ['unfinalizedBlocksProcess'];

@Injectable()
export class WorkerUnfinalizedBlocksService<T> implements IUnfinalizedBlocksService<T> {
  constructor(private host: HostUnfinalizedBlocks) {
    if (isMainThread) {
      throw new Error('Expected to be worker thread');
    }
  }

  async processUnfinalizedBlocks(block: IBlock<T>): Promise<Header | undefined> {
    return this.host.unfinalizedBlocksProcess(block.getHeader());
  }

  async processUnfinalizedBlockHeader(header: Header | undefined): Promise<Header | undefined> {
    return this.host.unfinalizedBlocksProcess(header);
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  init(reindex: (targetHeader: Header) => Promise<void>): Promise<Header> {
    throw new Error('This method should not be called from a worker');
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  resetUnfinalizedBlocks(): Promise<void> {
    throw new Error('This method should not be called from a worker');
  }
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  resetLastFinalizedVerifiedHeight(): Promise<void> {
    throw new Error('This method should not be called from a worker');
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getMetadataUnfinalizedBlocks(): Promise<Header[]> {
    throw new Error('This method should not be called from a worker');
  }

  registerFinalizedBlock(header: Header): void {
    throw new Error('This method should not be called from a worker');
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getHeaderForHeight(height: number): Promise<Header> {
    throw new Error('This method should not be called from a worker');
  }
}
