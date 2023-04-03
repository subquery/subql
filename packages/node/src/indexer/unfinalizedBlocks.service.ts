// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Block } from '@ethersproject/abstract-provider';
import { Injectable } from '@nestjs/common';
import {
  ApiService,
  getLogger,
  NodeConfig,
  StoreCacheService,
} from '@subql/node-core';
import { EthereumBlock } from '@subql/types-ethereum';
import { last } from 'lodash';
import { EthereumApi } from '../ethereum';

const logger = getLogger('UnfinalizedBlocks');

export const METADATA_UNFINALIZED_BLOCKS_KEY = 'unfinalizedBlocks';
export const METADATA_LAST_FINALIZED_PROCESSED_KEY =
  'lastFinalizedVerifiedHeight';

const UNFINALIZED_THRESHOLD = 200;

type UnfinalizedBlocks = [blockHeight: number, blockHash: string][];
export interface IUnfinalizedBlocksService {
  processUnfinalizedBlocks(
    block: EthereumBlock | undefined,
  ): Promise<number | null>;
}

@Injectable()
export class UnfinalizedBlocksService implements IUnfinalizedBlocksService {
  private unfinalizedBlocks: UnfinalizedBlocks;
  private finalizedHeader: Block;
  private lastCheckedBlockHeight: number;

  constructor(
    private readonly apiService: ApiService,
    private readonly nodeConfig: NodeConfig,
    private readonly storeCache: StoreCacheService,
  ) {}

  async init(
    reindex: (targetHeight: number) => Promise<void>,
  ): Promise<number | undefined> {
    logger.info(
      `Unfinalized blocks is ${
        this.nodeConfig.unfinalizedBlocks ? 'enabled' : 'disabled'
      }`,
    );
    // unfinalized blocks
    this.unfinalizedBlocks = await this.getMetadataUnfinalizedBlocks();
    this.lastCheckedBlockHeight = await this.getLastFinalizedVerifiedHeight();
    this.finalizedHeader = await this.api.getBlockByHeightOrHash(
      await this.api.getFinalizedBlockHeight(),
    );

    if (!this.nodeConfig.unfinalizedBlocks && this.unfinalizedBlocks.length) {
      logger.info('Processing unfinalized blocks');
      // Validate any previously unfinalized blocks

      const rewindHeight = await this.processUnfinalizedBlocks(null);

      if (rewindHeight !== null) {
        logger.info(
          `Found un-finalized blocks from previous indexing but unverified, rolling back to last finalized block ${rewindHeight} `,
        );
        await reindex(rewindHeight);
        logger.info(`Successful rewind to block ${rewindHeight}!`);
        return rewindHeight;
      } else {
        this.resetUnfinalizedBlocks();
        this.resetLastFinalizedVerifiedHeight();
      }
    }
  }

  async processUnfinalizedBlocks(
    block: EthereumBlock | undefined,
  ): Promise<number | null> {
    if (block) {
      this.registerUnfinalizedBlock(block.number, block.hash);
    }

    const forkedHeader = await this.hasForked();
    if (!forkedHeader) {
      // Remove blocks that are now confirmed finalized
      this.deleteFinalizedBlock();
    } else {
      // Get the last unfinalized block that is now finalized
      return this.getLastCorrectFinalizedBlock(forkedHeader);
    }

    return null;
  }

  private get api(): EthereumApi {
    return this.apiService.api;
  }

  private get finalizedBlockNumber(): number {
    return this.finalizedHeader.number;
  }

  registerFinalizedBlock(header: Block): void {
    if (this.finalizedHeader && this.finalizedBlockNumber >= header.number) {
      return;
    }
    this.finalizedHeader = header;
  }

  private registerUnfinalizedBlock(blockNumber: number, hash: string): void {
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
    this.saveUnfinalizedBlocks(this.unfinalizedBlocks);
  }

  private deleteFinalizedBlock(): void {
    if (
      this.lastCheckedBlockHeight !== undefined &&
      this.lastCheckedBlockHeight < this.finalizedBlockNumber
    ) {
      this.removeFinalized(this.finalizedBlockNumber);
      this.saveLastFinalizedVerifiedHeight(this.finalizedBlockNumber);
      this.saveUnfinalizedBlocks(this.unfinalizedBlocks);
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
  ): { blockHeight: number; hash: string } | undefined {
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
  private async hasForked(): Promise<Block | undefined> {
    const lastVerifiableBlock = this.getClosestRecord(
      this.finalizedBlockNumber,
    );

    // No unfinalized blocks
    if (!lastVerifiableBlock) {
      return;
    }

    // Unfinalized blocks beyond finalized block
    if (lastVerifiableBlock.blockHeight === this.finalizedBlockNumber) {
      if (lastVerifiableBlock.hash !== this.finalizedHeader.hash) {
        logger.warn(
          `Block fork found, enqueued un-finalized block at ${lastVerifiableBlock.blockHeight} with hash ${lastVerifiableBlock.hash}, actual hash is ${this.finalizedHeader.hash}`,
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
        header.number - lastVerifiableBlock.blockHeight >
        UNFINALIZED_THRESHOLD
      ) {
        header = await this.api.getBlockByHeightOrHash(
          lastVerifiableBlock.blockHeight,
        );
      } else {
        while (lastVerifiableBlock.blockHeight !== header.number) {
          header = await this.api.getBlockByHeightOrHash(header.parentHash);
        }
      }

      if (header.hash !== lastVerifiableBlock.hash) {
        logger.warn(
          `Block fork found, enqueued un-finalized block at ${lastVerifiableBlock.blockHeight} with hash ${lastVerifiableBlock.hash}, actual hash is ${header.hash}`,
        );
        return header;
      }
    }

    return;
  }

  private async getLastCorrectFinalizedBlock(
    forkedHeader: Block,
  ): Promise<number | undefined> {
    const bestVerifiableBlocks = this.unfinalizedBlocks.filter(
      ([bestBlockHeight]) =>
        Number(bestBlockHeight) <= this.finalizedBlockNumber,
    );

    let checkingHeader = forkedHeader;

    // Work backwards through the blocks until we find a matching hash
    for (const [block, hash] of bestVerifiableBlocks.reverse()) {
      if (hash === checkingHeader.hash || hash === checkingHeader.parentHash) {
        return Number(block);
      }

      // Get the new parent
      checkingHeader = await this.api.getBlockByHeightOrHash(
        checkingHeader.parentHash,
      );
    }

    return this.lastCheckedBlockHeight;
  }

  private saveUnfinalizedBlocks(unfinalizedBlocks: UnfinalizedBlocks): void {
    return this.storeCache.metadata.set(
      METADATA_UNFINALIZED_BLOCKS_KEY,
      JSON.stringify(unfinalizedBlocks),
    );
  }

  private saveLastFinalizedVerifiedHeight(height: number): void {
    return this.storeCache.metadata.set(
      METADATA_LAST_FINALIZED_PROCESSED_KEY,
      height,
    );
  }

  resetUnfinalizedBlocks(): void {
    this.storeCache.metadata.set(METADATA_UNFINALIZED_BLOCKS_KEY, '[]');
    this.unfinalizedBlocks = [];
  }

  resetLastFinalizedVerifiedHeight(): void {
    return this.storeCache.metadata.set(
      METADATA_LAST_FINALIZED_PROCESSED_KEY,
      null,
    );
  }

  //string should be jsonb object
  async getMetadataUnfinalizedBlocks(): Promise<UnfinalizedBlocks> {
    const val = await this.storeCache.metadata.find(
      METADATA_UNFINALIZED_BLOCKS_KEY,
    );
    if (val) {
      return JSON.parse(val) as UnfinalizedBlocks;
    }
    return [];
  }

  async getLastFinalizedVerifiedHeight(): Promise<number | undefined> {
    return this.storeCache.metadata.find(METADATA_LAST_FINALIZED_PROCESSED_KEY);
  }
}
