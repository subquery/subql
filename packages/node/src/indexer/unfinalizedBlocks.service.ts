// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  BaseUnfinalizedBlocksService,
  Header,
  IStoreModelProvider,
  mainThreadOnly,
  NodeConfig,
} from '@subql/node-core';
import {
  getBlockByHeight,
  substrateBlockToHeader,
  substrateHeaderToHeader,
} from '../utils/substrate';
import { ApiService } from './api.service';
import { BlockContent, LightBlockContent } from './types';

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<
  BlockContent | LightBlockContent
> {
  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
  ) {
    super(nodeConfig, storeModelProvider);
  }

  @mainThreadOnly()
  protected async getFinalizedHead(): Promise<Header> {
    return substrateHeaderToHeader(
      await this.apiService.api.rpc.chain.getHeader(
        await this.apiService.api.rpc.chain.getFinalizedHead(),
      ),
    );
  }

  // TODO: add cache here
  @mainThreadOnly()
  protected async getHeaderForHash(hash: string): Promise<Header> {
    return substrateBlockToHeader(
      await this.apiService.api.rpc.chain.getBlock(hash),
    );
  }

  @mainThreadOnly()
  async getHeaderForHeight(height: number): Promise<Header> {
    return substrateBlockToHeader(
      await getBlockByHeight(this.apiService.api, height),
    );
  }
}
