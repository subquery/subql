// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Block } from '@ethersproject/abstract-provider';
import { Injectable } from '@nestjs/common';
import {
  ApiService,
  BaseUnfinalizedBlocksService,
  Header,
  mainThreadOnly,
  NodeConfig,
  StoreCacheService,
} from '@subql/node-core';
import { BlockContent } from './types';

export function blockToHeader(block: BlockContent | Block): Header {
  return {
    blockHeight: block.number,
    blockHash: block.hash,
    parentHash: block.parentHash,
  };
}

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockContent> {
  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    storeCache: StoreCacheService,
  ) {
    super(nodeConfig, storeCache);
  }

  @mainThreadOnly()
  protected blockToHeader(block: BlockContent): Header {
    return blockToHeader(block);
  }

  @mainThreadOnly()
  protected async getFinalizedHead(): Promise<Header> {
    const finalizedBlock = await this.apiService.api.getFinalizedBlock();
    return blockToHeader(finalizedBlock);
  }

  @mainThreadOnly()
  protected async getHeaderForHash(hash: string): Promise<Header> {
    const block = await this.apiService.api.getBlockByHeightOrHash(hash);
    return blockToHeader(block);
  }

  @mainThreadOnly()
  protected async getHeaderForHeight(height: number): Promise<Header> {
    const block = await this.apiService.api.getBlockByHeightOrHash(height);
    return blockToHeader(block);
  }
}
