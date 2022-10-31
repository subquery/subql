// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { Header } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import {
  getLogger,
  getMetaDataInfo,
  MetadataRepo,
  NodeConfig,
} from '@subql/node-core';
import { SubstrateBlock } from '@subql/types';
import { last } from 'lodash';
import { Sequelize, Transaction } from 'sequelize';
import { ApiService } from './api.service';

const logger = getLogger('UnfinalizedBlocks');

export const METADATA_UNFINALIZED_BLOCKS_KEY = 'unfinalizedBlocks';
export const METADATA_LAST_FINALIZED_PROCESSED_KEY =
  'lastFinalizedVerifiedHeight';

const UNFINALIZED_THRESHOLD = 200;

type UnfinalizedBlocks = [blockHeight: number, blockHash: HexString][];

@Injectable()
export class UnfinalizedBlocksService {
  private unfinalizedBlocks: UnfinalizedBlocks;
  private finalizedHeader: Header;
  private metadataRepo: MetadataRepo;
  private lastCheckedBlockHeight: number;

  constructor(
    private readonly apiService: ApiService,
    private readonly nodeConfig: NodeConfig,
    private readonly sequelize: Sequelize,
  ) {}

  async init(
    metadataRepo: MetadataRepo,
    reindex: (targetHeight: number) => Promise<void>,
  ): Promise<number | undefined> {
    this.metadataRepo = metadataRepo;

    // unfinalized blocks
    this.unfinalizedBlocks = await this.getMetadataUnfinalizedBlocks();
    this.lastCheckedBlockHeight = await this.getLastFinalizedVerifiedHeight();
    this.finalizedHeader = await this.api.rpc.chain.getHeader(
      await this.api.rpc.chain.getFinalizedHead(),
    );

    if (!this.nodeConfig.unfinalizedBlocks && this.unfinalizedBlocks.length) {
      logger.info('Processing unfinalized blocks');
      // Validate any previously unfinalized blocks

      const tx = await this.sequelize.transaction();
      const rewindHeight = await this.processUnfinalizedBlocks(null, tx);

      if (rewindHeight !== null) {
        logger.info(
          `Found un-finalized blocks from previous indexing but unverified, rolling back to last finalized block ${rewindHeight} `,
        );
        await reindex(rewindHeight);
        logger.info(`Successful rewind to block ${rewindHeight}!`);
        return rewindHeight;
      } else {
        await this.resetUnfinalizedBlocks(tx);
        await this.resetLastFinalizedVerifiedHeight(tx);
      }
      await tx.commit();
    }
  }

  private get api(): ApiPromise {
    return this.apiService.getApi();
  }

  private get finalizedBlockNumber(): number {
    return this.finalizedHeader.number.toNumber();
  }

  async processUnfinalizedBlocks(
    block: SubstrateBlock | undefined,
    tx: Transaction,
  ): Promise<number | null> {
    if (block) {
      await this.registerUnfinalizedBlock(
        block.block.header.number.toNumber(),
        block.block.header.hash.toHex(),
        tx,
      );
    }

    const forkedHeader = await this.hasForked();
    if (!forkedHeader) {
      // Remove blocks that are now confirmed finalized
      await this.deleteFinalizedBlock(tx);
    } else {
      // Get the last unfinalized block that is now finalized
      return this.getLastCorrectFinalizedBlock(forkedHeader);
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
    if (blockNumber <= this.finalizedBlockNumber) return;

    // Ensure order
    if (
      this.unfinalizedBlocks.length &&
      last(this.unfinalizedBlocks)[0] + 1 !== blockNumber
    ) {
      logger.error('Unfinalized block is not sequential');
      process.exit(1);
    }

    this.unfinalizedBlocks.push([blockNumber, hash]);
    await this.saveUnfinalizedBlocks(this.unfinalizedBlocks, tx);
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
    this.unfinalizedBlocks = this.unfinalizedBlocks.filter(
      ([height]) => height > blockHeight,
    );
  }

  // find closest record from block heights
  private getClosestRecord(
    blockHeight: number,
  ): { blockHeight: number; hash: HexString } | undefined {
    // Have the block in the best block, can be verified
    const record = [...this.unfinalizedBlocks] // Copy so we can reverse
      .reverse() // Reverse the list to find the largest block
      .find(([bestBlockHeight]) => Number(bestBlockHeight) <= blockHeight);
    if (record) {
      const [bestBlockHeight, hash] = record;
      return { blockHeight: Number(bestBlockHeight), hash };
    }
    return undefined;
  }

  // check unfinalized blocks for a fork, returns the header where a fork happened
  private async hasForked(): Promise<Header | undefined> {
    const lastVerifiableBlock = this.getClosestRecord(
      this.finalizedBlockNumber,
    );

    // No unfinalized blocks
    if (!lastVerifiableBlock) {
      return;
    }

    // Unfinalized blocks beyond finalized block
    if (lastVerifiableBlock.blockHeight === this.finalizedBlockNumber) {
      if (lastVerifiableBlock.hash !== this.finalizedHeader.hash.toHex()) {
        logger.warn(
          `Block fork found, enqueued un-finalized block at ${
            lastVerifiableBlock.blockHeight
          } with hash ${
            lastVerifiableBlock.hash
          }, actual hash is ${this.finalizedHeader.hash.toHex()}`,
        );
        return this.finalizedHeader;
      }
    } else {
      // Unfinalized blocks below finalized block
      let header = this.finalizedHeader;
      /*
       * Iterate back through parent hashes until we get the header with the matching height
       * We use headers here rather than getBlockHash because of potential caching issues on the rpc
       * If we're off by a large number of blocks we can optimise by getting the block hash directly
       */
      if (
        header.number.toNumber() - lastVerifiableBlock.blockHeight >
        UNFINALIZED_THRESHOLD
      ) {
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
          }, actual hash is ${header.hash.toHex()}`,
        );
        return header;
      }
    }

    return;
  }

  private async getLastCorrectFinalizedBlock(
    forkedHeader: Header,
  ): Promise<number | undefined> {
    const bestVerifiableBlocks = this.unfinalizedBlocks.filter(
      ([bestBlockHeight]) =>
        Number(bestBlockHeight) <= this.finalizedBlockNumber,
    );

    let checkingHeader = forkedHeader;

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
        checkingHeader.parentHash,
      );
    }

    return this.lastCheckedBlockHeight;
  }

  private async saveUnfinalizedBlocks(
    unfinalizedBlocks: UnfinalizedBlocks,
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
    await this.setMetadata(METADATA_UNFINALIZED_BLOCKS_KEY, '[]', tx);
    this.unfinalizedBlocks = [];
  }

  async resetLastFinalizedVerifiedHeight(tx: Transaction): Promise<void> {
    return this.setMetadata(METADATA_LAST_FINALIZED_PROCESSED_KEY, null, tx);
  }

  private async setMetadata(
    key: string,
    value: string | number | boolean,
    tx: Transaction,
  ): Promise<void> {
    assert(this.metadataRepo, `Model _metadata does not exist`);
    await this.metadataRepo.upsert({ key, value }, { transaction: tx });
  }

  //string should be jsonb object
  async getMetadataUnfinalizedBlocks(): Promise<UnfinalizedBlocks> {
    const val = await getMetaDataInfo<string>(
      this.metadataRepo,
      METADATA_UNFINALIZED_BLOCKS_KEY,
    );
    if (val) {
      return JSON.parse(val) as UnfinalizedBlocks;
    }
    return [];
  }

  async getLastFinalizedVerifiedHeight(): Promise<number | undefined> {
    return getMetaDataInfo(
      this.metadataRepo,
      METADATA_LAST_FINALIZED_PROCESSED_KEY,
    );
  }
}
