// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import {
  Header,
  HostUnfinalizedBlocks,
  IUnfinalizedBlocksService,
} from '@subql/node-core';
import { BlockWrapper } from '@subql/types-stellar';
import { blockToHeader } from '../unfinalizedBlocks.service';

@Injectable()
export class WorkerUnfinalizedBlocksService
  implements IUnfinalizedBlocksService<BlockWrapper>
{
  constructor(private host: HostUnfinalizedBlocks) {}

  async processUnfinalizedBlockHeader(header: Header): Promise<number | null> {
    return this.host.unfinalizedBlocksProcess(header);
  }

  async processUnfinalizedBlocks({
    block,
  }: BlockWrapper): Promise<number | null> {
    return this.host.unfinalizedBlocksProcess(blockToHeader(block.sequence));
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
