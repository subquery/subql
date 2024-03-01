// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import { Header as SubstrateHeader } from '@polkadot/types/interfaces';
import {
  BaseUnfinalizedBlocksService,
  getLogger,
  Header,
  mainThreadOnly,
  NodeConfig,
  StoreCacheService,
} from '@subql/node-core';
import { ApiService } from './api.service';
import { BlockContent, LightBlockContent } from './types';

export function substrateHeaderToHeader(header: SubstrateHeader): Header {
  return {
    blockHeight: header.number.toNumber(),
    blockHash: header.hash.toHex(),
    parentHash: header.parentHash.toHex(),
  };
}

const logger = getLogger('unfinalized-service');

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<
  BlockContent | LightBlockContent
> {
  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    storeCache: StoreCacheService,
  ) {
    super(nodeConfig, storeCache);
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
