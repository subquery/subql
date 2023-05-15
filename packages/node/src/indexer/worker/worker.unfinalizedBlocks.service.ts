// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { IUnfinalizedBlocksService } from '@subql/node-core';
import { BlockContent } from '../types';

export type HostUnfinalizedBlocks = {
  unfinalizedBlocksProcess: (block: BlockContent) => Promise<number | null>;
};

export const hostUnfinalizedBlocksKeys: (keyof HostUnfinalizedBlocks)[] = [
  'unfinalizedBlocksProcess',
];

@Injectable()
export class WorkerUnfinalizedBlocksService
  implements IUnfinalizedBlocksService<BlockContent>
{
  constructor(private host: HostUnfinalizedBlocks) {}

  async processUnfinalizedBlocks(block: BlockContent): Promise<number | null> {
    return this.host.unfinalizedBlocksProcess(block);
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
}
