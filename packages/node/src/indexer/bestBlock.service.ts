// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { SignedBlock } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { getLogger } from '@subql/node-core';
import { ApiService } from './api.service';

const logger = getLogger('bestBlock');

@Injectable()
export class BestBlockService implements OnApplicationShutdown {
  private bestBlocks: Record<number, HexString>;
  private finalizedBlock: SignedBlock;

  constructor(private apiService: ApiService) {
    this.bestBlocks = {};
  }

  get api(): ApiPromise {
    return this.apiService.getApi();
  }

  onApplicationShutdown(): void {
    this.bestBlocks = {};
  }

  bestBlock(number): HexString {
    return this.bestBlocks[number];
  }

  registerFinalizedBlock(block: SignedBlock): void {
    if (
      this.finalizedBlock &&
      this.finalizedBlock.block.header.number.toNumber() ===
        block.block.header.number.toNumber()
    ) {
      return;
    }
    this.finalizedBlock = block;
  }

  registerBestBlock(blockNumber: number, hash: HexString) {
    if (!this.bestBlocks[blockNumber]) {
      this.bestBlocks[blockNumber] = hash;
    }
  }
  // remove any records less and equal than input finalized blockHeight
  removeFinalized(blockHeight: number): void {
    Object.entries(this.bestBlocks).map(([bestBlockHeight, hash]) => {
      if (Number(bestBlockHeight) <= blockHeight) {
        delete this.bestBlocks[bestBlockHeight];
      }
    });
  }

  // find closest record from block heights
  getClosestRecord(
    blockHeight: number,
  ): { blockHeight: number; hash: HexString } | undefined {
    // Have the block in the best block, can be verified
    if (Object.keys(this.bestBlocks).length !== 0) {
      const record = Object.entries(this.bestBlocks)
        .sort(([bestBlockA], [bestBlockB]) => {
          return Number(bestBlockB) - Number(bestBlockA);
        })
        .find(
          ([bestBlockHeight, hash]) => Number(bestBlockHeight) <= blockHeight,
        );
      if (record) {
        const [bestBlockHeight, hash] = record;
        return { blockHeight: Number(bestBlockHeight), hash: hash };
      }
    }
    return undefined;
  }

  // verify best blocks with finalized block
  async validateBestBlocks(): Promise<boolean> {
    const finalizedBlockNumber =
      this.finalizedBlock.block.header.number.toNumber();
    const lastVerifiableBlock = this.getClosestRecord(finalizedBlockNumber);
    if (lastVerifiableBlock) {
      if (lastVerifiableBlock.blockHeight === finalizedBlockNumber) {
        if (lastVerifiableBlock.hash !== this.finalizedBlock.hash.toHex()) {
          delete this.bestBlocks[lastVerifiableBlock.blockHeight];
          return false;
        }
      } else {
        // use api to fetch lastVerifiableBlock, see if hash matches
        const actualHash = (
          await this.api.rpc.chain.getBlockHash(lastVerifiableBlock.blockHeight)
        ).toHex();
        if (actualHash !== lastVerifiableBlock.hash) {
          logger.warn(
            `Validate best blocks failed, best block ${lastVerifiableBlock.blockHeight} stored hash ${lastVerifiableBlock.hash}, actual hash ${actualHash} `,
          );
          delete this.bestBlocks[lastVerifiableBlock.blockHeight];
          return false;
        }
      }
    }
    return true;
  }

  getLastBestBlock(): number {
    const keys = Object.keys(this.bestBlocks);
    return Number(keys[keys.length - 1]);
  }

  async getBestBlock(): Promise<number | undefined> {
    // checking finalized block with best blocks
    if (await this.validateBestBlocks()) {
      const bestBlock = this.getLastBestBlock();
      this.removeFinalized(this.finalizedBlock.block.header.number.toNumber());
      return bestBlock;
    } else {
      return undefined;
    }
  }

  async getLastCorrectBestBlock(): Promise<number | undefined> {
    const bestVerifiableBlocks = Object.entries(this.bestBlocks)
      .sort(([bestBlockA], [bestBlockB]) => {
        return Number(bestBlockB) - Number(bestBlockA);
      })
      .filter(
        ([bestBlockHeight, hash]) =>
          Number(bestBlockHeight) <=
          this.finalizedBlock.block.header.number.toNumber(),
      );
    for (const [block, hash] of bestVerifiableBlocks) {
      const actualHash = await this.api.rpc.chain.getBlockHash(block);
      if (hash === actualHash.toHex()) {
        return Number(block);
      }
    }
    return undefined;
  }
}
