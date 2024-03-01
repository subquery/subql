// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { isMainThread } from 'node:worker_threads';
import { Injectable } from '@nestjs/common';
import {
  Header,
  HostUnfinalizedBlocks,
  IUnfinalizedBlocksService,
} from '@subql/node-core';
import { IBlock } from '@subql/types-core';
import { BlockContent } from '../types';

@Injectable()
export class WorkerUnfinalizedBlocksService
  implements IUnfinalizedBlocksService<BlockContent>
{
  constructor(private host: HostUnfinalizedBlocks) {
    if (isMainThread) {
      throw new Error('Expected to be worker thread');
    }
  }

  async processUnfinalizedBlocks(
    block: IBlock<BlockContent>,
  ): Promise<number | undefined> {
    const header = block.getHeader();
    return this.host.unfinalizedBlocksProcess({
      blockHeight: header.height,
      blockHash: header.hash,
      parentHash: header.parentHash,
    });
  }

  async processUnfinalizedBlockHeader(
    header: Header | undefined,
  ): Promise<number | undefined> {
    return this.host.unfinalizedBlocksProcess(header);
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  init(reindex: (targetHeight: number) => Promise<void>): Promise<number> {
    throw new Error('This method should not be called from a worker');
  }
  resetUnfinalizedBlocks(): void {
    throw new Error('This method should not be called from a worker');
  }
  resetLastFinalizedVerifiedHeight(): void {
    throw new Error('This method should not be called from a worker');
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  getMetadataUnfinalizedBlocks(): Promise<Header[]> {
    throw new Error('This method should not be called from a worker');
  }
}
