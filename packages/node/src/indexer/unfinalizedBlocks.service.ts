// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  BaseUnfinalizedBlocksService,
  Header,
  IStoreModelProvider,
  mainThreadOnly,
  NodeConfig,
} from '@subql/node-core';
import { substrateHeaderToHeader } from '../utils/substrate';
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
    return substrateHeaderToHeader(
      await this.apiService.api.rpc.chain.getHeader(hash),
    );
  }

  @mainThreadOnly()
  protected async getHeaderForHeight(height: number): Promise<Header> {
    const hash = await this.apiService.api.rpc.chain.getBlockHash(height);
    return this.getHeaderForHash(hash.toHex());
  }
}
