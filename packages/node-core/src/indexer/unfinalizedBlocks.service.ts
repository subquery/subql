// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {last} from 'lodash';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {StoreCacheService} from './storeCache';

const logger = getLogger('UnfinalizedBlocks');

export const METADATA_UNFINALIZED_BLOCKS_KEY = 'unfinalizedBlocks';
export const METADATA_LAST_FINALIZED_PROCESSED_KEY = 'lastFinalizedVerifiedHeight';

const UNFINALIZED_THRESHOLD = 200;

export type Header = {
  blockHeight: number;
  blockHash: string;
  parentHash: string;
};
type UnfinalizedBlocks = Header[];

export interface IUnfinalizedBlocksService<B> {
  init(reindex: (targetHeight: number) => Promise<void>): Promise<number | undefined>;
  processUnfinalizedBlocks(block: B | undefined): Promise<number | undefined>;
  processUnfinalizedBlockHeader(header: Header | undefined): Promise<number | undefined>;
  resetUnfinalizedBlocks(): void;
  resetLastFinalizedVerifiedHeight(): void;
  getMetadataUnfinalizedBlocks(): Promise<UnfinalizedBlocks>;
}

export abstract class BaseUnfinalizedBlocksService<B> implements IUnfinalizedBlocksService<B> {
  private _unfinalizedBlocks?: UnfinalizedBlocks;
  private _finalizedHeader?: Header;
  protected lastCheckedBlockHeight?: number;

  protected abstract blockToHeader(block: B): Header;
  protected abstract getFinalizedHead(): Promise<Header>;
  protected abstract getHeaderForHash(hash: string): Promise<Header>;
  protected abstract getHeaderForHeight(height: number): Promise<Header>;

  private set unfinalizedBlocks(unfinalizedBlocks: UnfinalizedBlocks) {
    this._unfinalizedBlocks = unfinalizedBlocks;
  }

  protected get unfinalizedBlocks(): UnfinalizedBlocks {
    assert(this._unfinalizedBlocks !== undefined, new Error('Unfinalized blocks service has not been initialized'));
    return this._unfinalizedBlocks;
  }

  private set finalizedHeader(finalizedHeader: Header) {
    this._finalizedHeader = finalizedHeader;
  }

  protected get finalizedHeader(): Header {
    assert(this._finalizedHeader !== undefined, new Error('Unfinalized blocks service has not been initialized'));
    return this._finalizedHeader;
  }

  constructor(protected readonly nodeConfig: NodeConfig, protected readonly storeCache: StoreCacheService) {}

  async init(reindex: (targetHeight: number) => Promise<void>): Promise<number | undefined> {
    logger.info(`Unfinalized blocks is ${this.nodeConfig.unfinalizedBlocks ? 'enabled' : 'disabled'}`);

    this.unfinalizedBlocks = await this.getMetadataUnfinalizedBlocks();
    this.lastCheckedBlockHeight = await this.getLastFinalizedVerifiedHeight();
    this.finalizedHeader = await this.getFinalizedHead();

    if (!this.nodeConfig.unfinalizedBlocks && this.unfinalizedBlocks.length) {
      logger.info('Processing unfinalized blocks');
      // Validate any previously unfinalized blocks

      const rewindHeight = await this.processUnfinalizedBlocks();

      if (rewindHeight !== undefined) {
        logger.info(
          `Found un-finalized blocks from previous indexing but unverified, rolling back to last finalized block ${rewindHeight} `
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

  private get finalizedBlockNumber(): number {
    return this.finalizedHeader.blockHeight;
  }

  async processUnfinalizedBlockHeader(header?: Header): Promise<number | undefined> {
    if (header) {
      this.registerUnfinalizedBlock(header);
    }

    const forkedHeader = await this.hasForked();

    if (!forkedHeader) {
      // Remove blocks that are now confirmed finalized
      this.deleteFinalizedBlock();
    } else {
      // Get the last unfinalized block that is now finalized
      return this.getLastCorrectFinalizedBlock(forkedHeader);
    }

    return;
  }

  async processUnfinalizedBlocks(block?: B): Promise<number | undefined> {
    return this.processUnfinalizedBlockHeader(block ? this.blockToHeader(block) : undefined);
  }

  registerFinalizedBlock(header: Header): void {
    if (this.finalizedHeader && this.finalizedBlockNumber >= header.blockHeight) {
      return;
    }
    this.finalizedHeader = header;
  }

  private registerUnfinalizedBlock(header: Header): void {
    if (header.blockHeight <= this.finalizedBlockNumber) return;

    // Ensure order
    const lastUnfinalizedHeight = last(this.unfinalizedBlocks)?.blockHeight;
    if (lastUnfinalizedHeight !== undefined && lastUnfinalizedHeight + 1 !== header.blockHeight) {
      logger.error(
        `Unfinalized block is not sequential, lastUnfinalizedBlock='${lastUnfinalizedHeight}', newUnfinalizedBlock='${header.blockHeight}'`
      );
      process.exit(1);
    }

    this.unfinalizedBlocks.push(header);
    this.saveUnfinalizedBlocks(this.unfinalizedBlocks);
  }

  private deleteFinalizedBlock(): void {
    if (this.lastCheckedBlockHeight !== undefined && this.lastCheckedBlockHeight < this.finalizedBlockNumber) {
      this.removeFinalized(this.finalizedBlockNumber);
      this.saveLastFinalizedVerifiedHeight(this.finalizedBlockNumber);
      this.saveUnfinalizedBlocks(this.unfinalizedBlocks);
    }
    this.lastCheckedBlockHeight = this.finalizedBlockNumber;
  }

  // remove any records less and equal than input finalized blockHeight
  private removeFinalized(blockHeight: number): void {
    this.unfinalizedBlocks = this.unfinalizedBlocks.filter(({blockHeight: height}) => height > blockHeight);
  }

  // find closest record from block heights
  private getClosestRecord(blockHeight: number): Header | undefined {
    // Have the block in the best block, can be verified
    const record = [...this.unfinalizedBlocks] // Copy so we can reverse
      .reverse() // Reverse the list to find the largest block
      .find(({blockHeight: height}) => height <= blockHeight);
    if (record) {
      return record;
    }
    return undefined;
  }

  // check unfinalized blocks for a fork, returns the header where a fork happened
  protected async hasForked(): Promise<Header | undefined> {
    const lastVerifiableBlock = this.getClosestRecord(this.finalizedBlockNumber);

    // No unfinalized blocks
    if (!lastVerifiableBlock) {
      return;
    }

    // Unfinalized blocks beyond finalized block
    if (lastVerifiableBlock.blockHeight === this.finalizedBlockNumber) {
      if (lastVerifiableBlock.blockHash !== this.finalizedHeader.blockHash) {
        logger.warn(
          `Block fork found, enqueued un-finalized block at ${lastVerifiableBlock.blockHeight} with hash ${lastVerifiableBlock.blockHash}, actual hash is ${this.finalizedHeader.blockHash}`
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
      if (header.blockHeight - lastVerifiableBlock.blockHeight > UNFINALIZED_THRESHOLD) {
        header = await this.getHeaderForHeight(lastVerifiableBlock.blockHeight);
      } else {
        while (lastVerifiableBlock.blockHeight !== header.blockHeight) {
          header = await this.getHeaderForHash(header.parentHash);
        }
      }

      if (header.blockHash !== lastVerifiableBlock.blockHash) {
        logger.warn(
          `Block fork found, enqueued un-finalized block at ${lastVerifiableBlock.blockHeight} with hash ${lastVerifiableBlock.blockHash}, actual hash is ${header.blockHash}`
        );
        return header;
      }
    }

    return;
  }

  protected async getLastCorrectFinalizedBlock(forkedHeader: Header): Promise<number | undefined> {
    const bestVerifiableBlocks = this.unfinalizedBlocks.filter(
      ({blockHeight}) => blockHeight <= this.finalizedBlockNumber
    );

    let checkingHeader = forkedHeader;

    // Work backwards through the blocks until we find a matching hash
    for (const {blockHash, blockHeight} of bestVerifiableBlocks.reverse()) {
      if (blockHash === checkingHeader.blockHash || blockHash === checkingHeader.parentHash) {
        return blockHeight;
      }

      // Get the new parent
      checkingHeader = await this.getHeaderForHash(checkingHeader.parentHash);
    }

    return this.lastCheckedBlockHeight;
  }

  private saveUnfinalizedBlocks(unfinalizedBlocks: UnfinalizedBlocks): void {
    return this.storeCache.metadata.set(METADATA_UNFINALIZED_BLOCKS_KEY, JSON.stringify(unfinalizedBlocks));
  }

  private saveLastFinalizedVerifiedHeight(height: number): void {
    return this.storeCache.metadata.set(METADATA_LAST_FINALIZED_PROCESSED_KEY, height);
  }

  resetUnfinalizedBlocks(): void {
    this.storeCache.metadata.set(METADATA_UNFINALIZED_BLOCKS_KEY, '[]');
    this.unfinalizedBlocks = [];
  }

  resetLastFinalizedVerifiedHeight(): void {
    return this.storeCache.metadata.set(METADATA_LAST_FINALIZED_PROCESSED_KEY, null as any);
  }

  //string should be jsonb object
  async getMetadataUnfinalizedBlocks(): Promise<UnfinalizedBlocks> {
    const val = await this.storeCache.metadata.find(METADATA_UNFINALIZED_BLOCKS_KEY);
    if (val) {
      return JSON.parse(val) as UnfinalizedBlocks;
    }
    return [];
  }

  async getLastFinalizedVerifiedHeight(): Promise<number | undefined> {
    return this.storeCache.metadata.find(METADATA_LAST_FINALIZED_PROCESSED_KEY);
  }
}
