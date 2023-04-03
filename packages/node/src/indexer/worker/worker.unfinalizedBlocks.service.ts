// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { EthereumBlock } from '@subql/types-ethereum';
import { IUnfinalizedBlocksService } from '../unfinalizedBlocks.service';

export type HostUnfinalizedBlocks = {
  unfinalizedBlocksProcess: (block: EthereumBlock) => Promise<number | null>;
};

export const hostUnfinalizedBlocksKeys: (keyof HostUnfinalizedBlocks)[] = [
  'unfinalizedBlocksProcess',
];

@Injectable()
export class WorkerUnfinalizedBlocksService
  implements IUnfinalizedBlocksService
{
  constructor(private host: HostUnfinalizedBlocks) {}

  async processUnfinalizedBlocks(block: EthereumBlock): Promise<number | null> {
    return this.host.unfinalizedBlocksProcess(block);
  }
}
