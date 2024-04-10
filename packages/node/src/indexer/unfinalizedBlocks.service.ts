// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import {
  ApiService,
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  StoreCacheService,
  getLogger,
  mainThreadOnly,
} from '@subql/node-core';
import { BlockWrapper } from '@subql/types-stellar';
import { blockToHeader } from '../stellar/utils.stellar';

const logger = getLogger('unfinalized');

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockWrapper> {
  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    storeCache: StoreCacheService,
  ) {
    super(nodeConfig, storeCache);
  }

  @mainThreadOnly()
  protected async getFinalizedHead(): Promise<Header> {
    const finalizedHeight = await this.apiService.api.getFinalizedBlockHeight();
    return blockToHeader(finalizedHeight);
  }

  @mainThreadOnly()
  protected async getHeaderForHash(hash: string): Promise<Header> {
    return this.getHeaderForHeight(parseInt(hash, 10));
  }

  @mainThreadOnly()
  protected async getHeaderForHeight(height: number): Promise<Header> {
    return Promise.resolve(blockToHeader(height));
  }
}
