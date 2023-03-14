// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { SubstrateBlock } from '@subql/types';
import { IUnfinalizedBlocksService } from '../unfinalizedBlocks.service';

export type HostUnfinalizedBlocks = {
  unfinalizedBlocksProcess: (block: SubstrateBlock) => Promise<number | null>;
};

export const hostUnfinalizedBlocksKeys: (keyof HostUnfinalizedBlocks)[] = [
  'unfinalizedBlocksProcess',
];

@Injectable()
export class WorkerUnfinalizedBlocksService
  implements IUnfinalizedBlocksService
{
  constructor(private host: HostUnfinalizedBlocks) {}

  async processUnfinalizedBlocks(
    block: SubstrateBlock,
  ): Promise<number | null> {
    return this.host.unfinalizedBlocksProcess(block);
  }
}
