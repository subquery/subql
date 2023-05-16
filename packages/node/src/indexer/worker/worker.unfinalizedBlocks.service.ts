// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { Header, IUnfinalizedBlocksService } from '@subql/node-core';
import { BlockWrapper, EthereumBlock } from '@subql/types-ethereum';

export type HostUnfinalizedBlocks = {
  unfinalizedBlocksProcess: (header: Header) => Promise<number | null>;
};

export const hostUnfinalizedBlocksKeys: (keyof HostUnfinalizedBlocks)[] = [
  'unfinalizedBlocksProcess',
];

@Injectable()
export class WorkerUnfinalizedBlocksService
  implements IUnfinalizedBlocksService<BlockWrapper>
{
  constructor(private host: HostUnfinalizedBlocks) {}

  async processUnfinalizedBlockHeader(header: Header): Promise<number | null> {
    return this.host.unfinalizedBlocksProcess(header);
  }

  async processUnfinalizedBlocks({
    block: { hash: blockHash, parentHash },
    blockHeight,
  }: BlockWrapper): Promise<number | null> {
    return this.host.unfinalizedBlocksProcess({
      blockHash,
      blockHeight,
      parentHash,
    });
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
