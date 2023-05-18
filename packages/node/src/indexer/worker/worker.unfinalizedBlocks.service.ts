// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { Header, IUnfinalizedBlocksService } from '@subql/node-core';
import { BlockContent } from '../types';
import { substrateHeaderToHeader } from '../unfinalizedBlocks.service';

export type HostUnfinalizedBlocks = {
  unfinalizedBlocksProcess: (header: Header) => Promise<number | null>;
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
    return this.host.unfinalizedBlocksProcess(
      substrateHeaderToHeader(block.block.block.header),
    );
  }

  async processUnfinalizedBlockHeader(header: Header): Promise<number | null> {
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
}
