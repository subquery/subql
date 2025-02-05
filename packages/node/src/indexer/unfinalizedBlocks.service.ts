// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  ApiService,
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  IStoreModelProvider,
  getLogger,
  mainThreadOnly,
} from '@subql/node-core';
import { BlockWrapper } from '@subql/types-stellar';
import { stellarBlockToHeader } from '../stellar/utils.stellar';

const logger = getLogger('unfinalized');

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockWrapper> {
  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
  ) {
    super(nodeConfig, storeModelProvider);
  }

  @mainThreadOnly()
  protected async getFinalizedHead(): Promise<Header> {
    const finalizedBlock = await this.apiService.api.getFinalizedBlock();
    return stellarBlockToHeader(finalizedBlock);
  }

  @mainThreadOnly()
  protected async getHeaderForHash(hash: string): Promise<Header> {
    return this.getHeaderForHeight(parseInt(hash, 10));
  }

  @mainThreadOnly()
  async getHeaderForHeight(height: number): Promise<Header> {
    const block = (await this.apiService.api.fetchBlocks([height]))[0];
    return stellarBlockToHeader(block);
  }
}
