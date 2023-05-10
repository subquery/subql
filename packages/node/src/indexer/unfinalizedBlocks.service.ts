// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { Header as SubstrateHeader } from '@polkadot/types/interfaces';
import {
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  StoreCacheService,
} from '@subql/node-core';
import { ApiService } from './api.service';
import { BlockContent } from './types';

export function substrateHeaderToHeader(header: SubstrateHeader): Header {
  return {
    blockHeight: header.number.toNumber(),
    blockHash: header.hash.toHex(),
    parentHash: header.parentHash.toHex(),
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

  protected blockToHeader(block: BlockContent): Header {
    return substrateHeaderToHeader(block.block.block.header);
  }

  protected async getFinalizedHead(): Promise<Header> {
    return substrateHeaderToHeader(
      await this.apiService.api.rpc.chain.getHeader(
        await this.apiService.api.rpc.chain.getFinalizedHead(),
      ),
    );
  }

  protected async getHeaderForHash(hash: string): Promise<Header> {
    return substrateHeaderToHeader(
      await this.apiService.api.rpc.chain.getHeader(hash),
    );
  }

  protected async getHeaderForHeight(height: number): Promise<Header> {
    const hash = await this.apiService.api.rpc.chain.getBlockHash(height);
    return this.getHeaderForHash(hash.toHex());
  }
}
