// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import {
  ApiService,
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  StoreCacheService,
  getLogger,
} from '@subql/node-core';
import { BlockWrapper, SorobanBlock } from '@subql/types-soroban';

const logger = getLogger('unfinalized');

export function blockToHeader(blockHeight: number): Header {
  return {
    blockHeight: blockHeight,
    blockHash: blockHeight.toString(),
    parentHash: (blockHeight - 1).toString(),
  };
}

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockWrapper> {
  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    storeCache: StoreCacheService,
  ) {
    super(nodeConfig, storeCache);
  }

  protected blockToHeader(block: BlockWrapper): Header {
    return blockToHeader(block.block.height);
  }

  protected async getFinalizedHead(): Promise<Header> {
    const finalizedBlock = await this.apiService.api.getFinalizedBlock();
    logger.info(JSON.stringify(finalizedBlock));
    return blockToHeader(finalizedBlock.sequence);
  }

  protected async getHeaderForHash(hash: string): Promise<Header> {
    return this.getHeaderForHeight(parseInt(hash, 10));
  }

  protected async getHeaderForHeight(height: number): Promise<Header> {
    return Promise.resolve(blockToHeader(height));
  }
}
