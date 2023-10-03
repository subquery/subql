// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import {
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  StoreCacheService,
  mainThreadOnly,
} from '@subql/node-core';
import { ApiService } from './api.service';
import { BlockContent } from './types';

/*
 * Cosmos has instant finalization, there is also no rpc method to get a block by hash
 * To get around this we use blockHeights as hashes
 */
export function cosmosBlockToHeader(blockHeight: number): Header {
  return {
    blockHeight: blockHeight,
    blockHash: blockHeight.toString(),
    parentHash: (blockHeight - 1).toString(),
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
    return cosmosBlockToHeader(block.block.header.height);
  }

  @mainThreadOnly()
  protected async getFinalizedHead(): Promise<Header> {
    return this.getHeaderForHeight(await this.apiService.api.getHeight());
  }

  @mainThreadOnly()
  protected async getHeaderForHash(hash: string): Promise<Header> {
    return this.getHeaderForHeight(parseInt(hash, 10));
  }

  @mainThreadOnly()
  protected async getHeaderForHeight(height: number): Promise<Header> {
    return Promise.resolve(cosmosBlockToHeader(height));
  }
}
