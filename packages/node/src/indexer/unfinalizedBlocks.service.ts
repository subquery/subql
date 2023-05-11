// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Block } from '@ethersproject/abstract-provider';
import { Injectable } from '@nestjs/common';
import {
  ApiService,
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  StoreCacheService,
} from '@subql/node-core';
import { BlockWrapper, EthereumBlock } from '@subql/types-ethereum';
import { EthereumApi } from '../ethereum';

export function blockToHeader(block: EthereumBlock | Block): Header {
  return {
    blockHeight: block.number,
    blockHash: block.hash,
    parentHash: block.parentHash,
  };
}

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockWrapper> {
  constructor(
    private readonly apiService: ApiService<any, EthereumApi>,
    nodeConfig: NodeConfig,
    storeCache: StoreCacheService,
  ) {
    super(nodeConfig, storeCache);
  }

  protected blockToHeader(block: BlockWrapper): Header {
    return blockToHeader(block.block);
  }

  protected async getFinalizedHead(): Promise<Header> {
    const finalizedHeight = await this.apiService.api.getFinalizedBlockHeight();
    const finalizedBlock = await this.apiService.api.getBlockByHeightOrHash(
      finalizedHeight,
    );
    return blockToHeader(finalizedBlock);
  }

  protected async getHeaderForHash(hash: string): Promise<Header> {
    const block = await this.apiService.api.getBlockByHeightOrHash(hash);
    return blockToHeader(block);
  }

  protected async getHeaderForHeight(height: number): Promise<Header> {
    const block = await this.apiService.api.getBlockByHeightOrHash(height);
    return blockToHeader(block);
  }
}
