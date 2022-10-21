// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { Header, SignedBlock } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { getLogger, MetadataRepo } from '@subql/node-core';
import { SubstrateBlock } from '@subql/types';
import { Transaction } from 'sequelize';
import { ApiService } from './api.service';
import { BestBlock } from './types';

const logger = getLogger('UnfinalizedBlocks');

export const METADATA_UNFINALIZED_BLOCKS_KEY = 'unfinalizedBlocks';
export const METADATA_LAST_FINALIZED_PROCESSED_KEY =
  'lastFinalizedVerifiedHeight';

@Injectable()
export class UnfinalizedBlocksService {
  private unfinalizedBlocks: BestBlock[] = []; // ordered by blockheight asc
  private finalizedHeader: Header;
  private metaDataRepo: MetadataRepo;
  private lastCheckedBlockHeight: number;

  constructor(private apiService: ApiService) {}

  init(
    metadataRepo: MetadataRepo,
    startUnfinalizedBlocks: Record<number, HexString>,
    lastFinalizedVerifiedHeight: number,
  ): void {
    this.unfinalizedBlocks = startUnfinalizedBlocks;
    this.lastCheckedBlockHeight = lastFinalizedVerifiedHeight;
    this.metaDataRepo = metadataRepo;
  }

  private get api(): ApiPromise {
    return this.apiService.getApi();
  }

  private get finalizedBlockNumber(): number {
    return this.finalizedHeader.number.toNumber();
  }

  private getSortedUnfinalizedBlocks(): [string, HexString][] {
    return Object.entries(this.unfinalizedBlocks).sort(
      ([bestBlockA], [bestBlockB]) => {
        return Number(bestBlockB) - Number(bestBlockA);
      },
    );
  }

  async processUnfinalizedBlocks(
    block: SubstrateBlock,
    tx: Transaction,
  ): Promise<number | null> {
    await this.registerUnfinalizedBlock(
      block.block.header.number.toNumber(),
      block.hash.toHex(),
      tx,
    );
    if (!this.hasForked()) {
      // Remove blocks that are now confirmed finalized
      await this.deleteFinalizedBlock(tx);
      return null;
    } else {
      // Get the last unfinalized block that is now finalized
      return this.getLastCorrectFinalizedBlock();
    }
  }

  async registerFinalizedBlock(header: Header): Promise<void> {
    if (
      this.finalizedHeader &&
      this.finalizedBlockNumber >= header.number.toNumber()
    ) {
      return;
    }
    this.finalizedHeader = header;
    // find fork
    await this.markForkedBlocks();
    // end
  }

  private async markForkedBlocks(): Promise<void> {
    const blocksToBeVerified = this.getClosestRecord(this.finalizedBlockNumber);
    let finalizedHeader = this.finalizedHeader;
    let findNoFork = false;
    for (let i = blocksToBeVerified.length - 1; i >= 0; i--) {
      const blockToBeVerified = blocksToBeVerified[i];
      if (findNoFork) {
        blockToBeVerified.forked = false;
        continue;
      }
      // if the distance between finalizedHeader.number.toNumber() and blockToBeVerified.number is very big, we might still chose getHeader
      if (this.finalizedBlockNumber - blockToBeVerified.number > 200) {
        // blockToBeVerified is 20min ago
        const hash = await this.api.rpc.chain.getBlockHash(
          blockToBeVerified.number,
        );
        if (hash.toHex() !== blockToBeVerified.hash) {
          blockToBeVerified.forked = true;
          finalizedHeader = await this.api.rpc.chain.getHeader(hash);
        }
      } else {
        for (
          let j = finalizedHeader.number.toNumber();
          j >= blockToBeVerified.number;
          j--
        ) {
          if (finalizedHeader.number.toNumber() === blockToBeVerified.number) {
            blockToBeVerified.forked =
              blockToBeVerified.hash !== finalizedHeader.hash.toHex();
            if (!blockToBeVerified.forked) {
              findNoFork = true;
            }
          } else {
            finalizedHeader = await this.api.rpc.chain.getHeader(
              finalizedHeader.parentHash,
            );
          }
        }
      }
    }
  }

  private async registerUnfinalizedBlock(
    blockNumber: number,
    hash: HexString,
    tx: Transaction,
  ): Promise<void> {
    if (blockNumber > this.finalizedBlockNumber) {
      this.unfinalizedBlocks[blockNumber] = hash;
      await this.saveUnfinalizedBlocks(this.unfinalizedBlocks, tx);
    }
  }

  // delete all blocks that are marked forked:false
  private async deleteFinalizedBlock(tx: Transaction): Promise<void> {
    if (
      this.lastCheckedBlockHeight !== undefined &&
      this.lastCheckedBlockHeight < this.finalizedBlockNumber
    ) {
      this.removeFinalized(this.finalizedBlockNumber);
      await this.saveLastFinalizedVerifiedHeight(this.finalizedBlockNumber, tx);
      await this.saveUnfinalizedBlocks(this.unfinalizedBlocks, tx);
    }
    this.lastCheckedBlockHeight = this.finalizedBlockNumber;
  }

  // remove any records less and equal than input finalized blockHeight
  private removeFinalized(blockHeight: number): void {
    Object.entries(this.unfinalizedBlocks).map(([bestBlockHeight, hash]) => {
      if (Number(bestBlockHeight) <= blockHeight) {
        delete this.unfinalizedBlocks[bestBlockHeight];
      }
    });
  }

  // return the continues marked blocks from index0 of this.unfinalizedBlocks
  // e.g [no,no,unknown,no,yes] will return [no,no]
  private getMarkedBlocks(): BestBlock[] {
    // Have the block in the best block, can be verified
    const firstUnknown = this.unfinalizedBlocks.findIndex(
      (b) => b.forked === undefined,
    );
    if (firstUnknown === 0) {
      return [];
    } else if (firstUnknown < 0) {
      return this.unfinalizedBlocks;
    } else {
      // (firstUnknown > 0)
      return this.unfinalizedBlocks.slice(0, firstUnknown);
    }
  }

  // find closest record from block heights
  // TODO: return range of blocks between earlist unmarked block and the block closest to ${blockHeight}
  private getClosestRecord(blockHeight: number): BestBlock[] {
    // Have the block in the best block, can be verified
    const markedBlocks = this.getMarkedBlocks();
    const idx = markedBlocks.findIndex((b) => b.number > blockHeight);
    if (idx <= 0) {
      return undefined;
    } else {
      return markedBlocks.slice(0, idx);
    }
  }

  // check unfinalized blocks for a fork
  private hasForked(): boolean {
    return this.getMarkedBlocks().findIndex((b) => b.forked) > -1;
  }

  private getLastCorrectFinalizedBlock(): number | undefined {
    const verifiedNonForks = this.unfinalizedBlocks.filter(
      (b) => b.forked === false,
    );
    if (verifiedNonForks.length > 0) {
      return verifiedNonForks[verifiedNonForks.length - 1].number;
    }

    return this.lastCheckedBlockHeight;
  }

  private async saveUnfinalizedBlocks(
    unfinalizedBlocks: BestBlocks,
    tx: Transaction,
  ): Promise<void> {
    return this.setMetadata(
      METADATA_UNFINALIZED_BLOCKS_KEY,
      JSON.stringify(unfinalizedBlocks),
      tx,
    );
  }

  private async saveLastFinalizedVerifiedHeight(
    height: number,
    tx: Transaction,
  ) {
    return this.setMetadata(METADATA_LAST_FINALIZED_PROCESSED_KEY, height, tx);
  }

  async resetUnfinalizedBlocks(tx: Transaction): Promise<void> {
    await this.setMetadata(METADATA_UNFINALIZED_BLOCKS_KEY, '{}', tx);
    this.unfinalizedBlocks = {};
  }

  async resetLastFinalizedVerifiedHeight(tx: Transaction): Promise<void> {
    return this.setMetadata(METADATA_LAST_FINALIZED_PROCESSED_KEY, null, tx);
  }

  private async setMetadata(
    key: string,
    value: string | number | boolean,
    tx: Transaction,
  ): Promise<void> {
    assert(this.metaDataRepo, `Model _metadata does not exist`);
    await this.metaDataRepo.upsert({ key, value }, { transaction: tx });
  }
}
