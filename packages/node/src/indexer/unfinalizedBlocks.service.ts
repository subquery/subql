// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { Header } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { getLogger, MetadataRepo } from '@subql/node-core';
import { SubstrateBlock } from '@subql/types';
import { Transaction } from 'sequelize';
import { ApiService } from './api.service';
import { BestBlocks } from './types';

const logger = getLogger('UnfinalizedBlocks');

export const METADATA_UNFINALIZED_BLOCKS_KEY = 'unfinalizedBlocks';
export const METADATA_LAST_FINALIZED_PROCESSED_KEY =
  'lastFinalizedVerifiedHeight';

@Injectable()
export class UnfinalizedBlocksService {
  private unfinalizedBlocks: BestBlocks = {};
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
    if (!(await this.hasForked())) {
      // Remove blocks that are now confirmed finalized
      await this.deleteFinalizedBlock(tx);
    } else {
      // Get the last unfinalized block that is now finalized
      return this.getLastCorrectFinalizedBlock();
    }

    return null;
  }

  registerFinalizedBlock(header: Header): void {
    if (
      this.finalizedHeader &&
      this.finalizedBlockNumber >= header.number.toNumber()
    ) {
      return;
    }
    this.finalizedHeader = header;
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

  // find closest record from block heights
  private getClosestRecord(
    blockHeight: number,
  ): { blockHeight: number; hash: HexString } | undefined {
    // Have the block in the best block, can be verified
    const record = this.getSortedUnfinalizedBlocks().find(
      ([bestBlockHeight, hash]) => Number(bestBlockHeight) <= blockHeight,
    );
    if (record) {
      const [bestBlockHeight, hash] = record;
      return { blockHeight: Number(bestBlockHeight), hash };
    }
    return undefined;
  }

  // check unfinalized blocks for a fork
  private async hasForked(): Promise<boolean> {
    const lastVerifiableBlock = this.getClosestRecord(
      this.finalizedBlockNumber,
    );

    // No unfinalized blocks
    if (!lastVerifiableBlock) {
      return false;
    }

    // Unfinalized blocks beyond finalized block
    if (lastVerifiableBlock.blockHeight === this.finalizedBlockNumber) {
      return lastVerifiableBlock.hash !== this.finalizedHeader.hash.toHex();
    } else {
      // Unfinalized blocks below finalized block
      let header = this.finalizedHeader;
      /*
       * Iterate back through parent hashes until we get the header with the matching height
       * We use headers here rather than getBlockHash because of potential caching issues on the rpc
       * If we're off by a large number of blocks we can optimise by getting the block hash directly
       */
      if (header.number.toNumber() - lastVerifiableBlock.blockHeight > 200) {
        const hash = await this.api.rpc.chain.getBlockHash(
          lastVerifiableBlock.blockHeight,
        );
        header = await this.api.rpc.chain.getHeader(hash);
      } else {
        while (lastVerifiableBlock.blockHeight !== header.number.toNumber()) {
          header = await this.api.rpc.chain.getHeader(header.parentHash);
        }
      }
      if (header.hash.toHex() !== lastVerifiableBlock.hash) {
        logger.warn(
          `Block fork found, enqueued un-finalized block at ${
            lastVerifiableBlock.blockHeight
          } with hash ${
            lastVerifiableBlock.hash
          }, actual hash is ${header.hash.toHex()} `,
        );
        return true;
      }
    }
  }

  private async getLastCorrectFinalizedBlock(): Promise<number | undefined> {
    const bestVerifiableBlocks = this.getSortedUnfinalizedBlocks().filter(
      ([bestBlockHeight, hash]) =>
        Number(bestBlockHeight) <= this.finalizedBlockNumber,
    );

    let checkingHeader = this.finalizedHeader;

    // Work backwards through the blocks until we find a matching hash
    for (const [block, hash] of bestVerifiableBlocks.reverse()) {
      if (
        hash === checkingHeader.hash.toHex() ||
        hash === checkingHeader.parentHash.toHex()
      ) {
        return Number(block);
      }

      // Get the new parent
      checkingHeader = await this.api.rpc.chain.getHeader(
        this.finalizedHeader.parentHash,
      );
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
