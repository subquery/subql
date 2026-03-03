// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Inject, Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Transaction} from '@subql/x-sequelize';
import {isEqual, last} from 'lodash';
import {IBlockchainService} from '../blockchain.service';
import {NodeConfig} from '../configure';
import {IndexerEvent} from '../events';
import {Header, IBlock} from '../indexer/types';
import {getLogger} from '../logger';
import {mainThreadOnly} from '../utils';
import {ProofOfIndex} from './entities';
import {PoiBlock} from './poi';
import {IStoreModelProvider} from './storeModelProvider';
import util from 'node:util';

const logger = getLogger('UnfinalizedBlocks');

export const METADATA_UNFINALIZED_BLOCKS_KEY = 'unfinalizedBlocks';
export const METADATA_LAST_FINALIZED_PROCESSED_KEY = 'lastFinalizedVerifiedHeight';

export const POI_NOT_ENABLED_ERROR_MESSAGE = 'Poi is not enabled, unable to check for last finalized block';

const UNFINALIZED_THRESHOLD = 200;

type UnfinalizedBlocks = Header[];

export interface IUnfinalizedBlocksService<B> extends IUnfinalizedBlocksServiceUtil {
  init(reindex: (targetHeader: Header) => Promise<void>): Promise<Header | undefined>;
  processUnfinalizedBlocks(block: IBlock<B> | undefined): Promise<Header | undefined>;
  processUnfinalizedBlockHeader(header: Header | undefined): Promise<Header | undefined>;
  resetUnfinalizedBlocks(tx?: Transaction): Promise<void>;
  resetLastFinalizedVerifiedHeight(tx?: Transaction): Promise<void>;
  getMetadataUnfinalizedBlocks(): Promise<UnfinalizedBlocks>;
}

export interface IUnfinalizedBlocksServiceUtil {
  registerFinalizedBlock(header: Header): void;
}

@Injectable()
export class UnfinalizedBlocksService<B = any> implements IUnfinalizedBlocksService<B> {
  private _unfinalizedBlocks?: UnfinalizedBlocks;
  private _finalizedHeader?: Header;
  protected lastCheckedBlockHeight?: number;
  private _latestBestHeight?: number;

  @mainThreadOnly()
  private blockToHeader(block: IBlock<B>): Header {
    return block.getHeader();
  }

  protected get unfinalizedBlocks(): UnfinalizedBlocks {
    assert(this._unfinalizedBlocks !== undefined, new Error('Unfinalized blocks service has not been initialized'));
    return this._unfinalizedBlocks;
  }

  protected get finalizedHeader(): Header {
    assert(this._finalizedHeader !== undefined, new Error('Unfinalized blocks service has not been initialized'));
    return this._finalizedHeader;
  }

  constructor(
    protected readonly nodeConfig: NodeConfig,
    @Inject('IStoreModelProvider') protected readonly storeModelProvider: IStoreModelProvider,
    @Inject('IBlockchainService') protected blockchainService: IBlockchainService
  ) {}

  async init(reindex: (tagetHeader: Header) => Promise<void>): Promise<Header | undefined> {
    logger.info(`Unfinalized blocks is ${this.nodeConfig.unfinalizedBlocks ? 'enabled' : 'disabled'}`);

    this._unfinalizedBlocks = await this.getMetadataUnfinalizedBlocks();
    this.lastCheckedBlockHeight = await this.getLastFinalizedVerifiedHeight();
    this._finalizedHeader = await this.blockchainService.getFinalizedHeader();

    if (this.unfinalizedBlocks.length) {
      logger.info('Processing unfinalized blocks');
      // Validate any previously unfinalized blocks

      const rewindHeight = await this.processUnfinalizedBlockHeader();
      if (rewindHeight !== undefined) {
        logger.info(
          `Found un-finalized blocks from previous indexing but unverified, rolling back to last finalized block rewindHeight=${util.inspect(
            rewindHeight,
            {depth: 6, colors: false}
          )}`
        );
        await reindex(rewindHeight);
        logger.info(`Successful rewind to block ${rewindHeight.blockHeight}!`);
        return rewindHeight;
      } else {
        await this.resetUnfinalizedBlocks();
        await this.resetLastFinalizedVerifiedHeight();
      }
    }
  }

  private get finalizedBlockNumber(): number {
    return this.finalizedHeader.blockHeight;
  }

  // If not for workers this could be private
  async processUnfinalizedBlockHeader(header?: Header): Promise<Header | undefined> {
    let forkedHeader;
    if (header) {
      forkedHeader = await this.registerUnfinalizedBlock(header);
    }
    if (!forkedHeader) {
      forkedHeader = await this.hasForked();
    }

    if (!forkedHeader) {
      // Remove blocks that are now confirmed finalized
      await this.deleteFinalizedBlock();
    } else {
      // Get the last unfinalized block that is now finalized
      return this.getLastCorrectFinalizedBlock(forkedHeader);
    }

    return;
  }

  async processUnfinalizedBlocks(block: IBlock<B>): Promise<Header | undefined> {
    return this.processUnfinalizedBlockHeader(this.blockToHeader(block));
  }

  registerFinalizedBlock(header: Header): void {
    if (this.finalizedHeader && this.finalizedBlockNumber >= header.blockHeight) {
      return;
    }
    this._finalizedHeader = header;
  }

  @OnEvent(IndexerEvent.BlockBest)
  updateBestHeight(payload: {height: number}): void {
    this._latestBestHeight = payload.height;
  }

  private async registerUnfinalizedBlock(header: Header): Promise<Header | undefined> {
    if (header.blockHeight <= this.finalizedBlockNumber) return;

    if (this._latestBestHeight === undefined) {
      this._latestBestHeight = await this.blockchainService.getBestHeight();
    }

    const bestHeight = Math.max(this._latestBestHeight, header.blockHeight);
    const safeHeight = Math.max(bestHeight - UNFINALIZED_THRESHOLD, 0);

    const currentBlocks = this.unfinalizedBlocks;
    if (currentBlocks.length) {
      const filteredBlocks = currentBlocks.filter(({blockHeight}) => blockHeight >= safeHeight);
      if (filteredBlocks.length !== currentBlocks.length) {
        logger.info(
          `Dropping ${currentBlocks.length - filteredBlocks.length} unfinalized blocks below safe height ${safeHeight}`
        );
        this._unfinalizedBlocks = filteredBlocks;
      }
    }

    const lastUnfinalized = last(this.unfinalizedBlocks);
    const lastUnfinalizedHeight = lastUnfinalized?.blockHeight;

    // If this is the first unfinalized block or it's sequential, just add it
    if (lastUnfinalizedHeight === undefined || lastUnfinalizedHeight + 1 === header.blockHeight) {
      this.unfinalizedBlocks.push(header);
      if (lastUnfinalized && header.parentHash && lastUnfinalized.blockHash !== header.parentHash) {
        return header;
      }
      await this.saveUnfinalizedBlocks(this.unfinalizedBlocks);
      return;
    }

    // Calculate gap start, only backfill from safeHeight onwards
    const gapStart = Math.max(lastUnfinalizedHeight + 1, safeHeight);
    const gapEnd = header.blockHeight - 1;

    // If there's still a gap to backfill
    if (gapStart <= gapEnd) {
      const gapSize = gapEnd - gapStart + 1;
      logger.info(`Backfilling missing unfinalized blocks from ${gapStart} to ${gapEnd} (${gapSize} blocks)`);

      // Backfill missing blocks
      const backfillResult = await this.backfillBlocks(gapStart, gapEnd, header);

      // Add the original header after successful backfill
      // Note: We push even if fork was detected. The in-memory state will be reset
      // when the caller processes the fork and triggers a reindex.
      this.unfinalizedBlocks.push(header);

      if (backfillResult.forkDetected) {
        return backfillResult.forkHeader;
      }
    } else {
      // No gap to backfill, just add the new header
      this.unfinalizedBlocks.push(header);
    }

    await this.saveUnfinalizedBlocks(this.unfinalizedBlocks);
    return;
  }

  /**
   * Backfills missing blocks between the last unfinalized block and a new block.
   * Validates parentHash chain during backfill to detect forks.
   *
   * @param startHeight - The first missing block height
   * @param endHeight - The last missing block height
   * @param nextHeader - The next header that triggered backfill (for validation)
   * @returns Object indicating if fork was detected and the fork header if so
   */
  private async backfillBlocks(
    startHeight: number,
    endHeight: number,
    nextHeader: Header
  ): Promise<{forkDetected: boolean; forkHeader?: Header}> {
    // Fetch and validate each missing block
    for (let height = startHeight; height <= endHeight; height++) {
      try {
        const header = await this.blockchainService.getHeaderForHeight(height);

        // Validate parentHash chain
        const previousHeader = last(this.unfinalizedBlocks);

        if (previousHeader && header.parentHash !== previousHeader.blockHash) {
          logger.warn(
            `Fork detected during backfill at height ${height}. ` +
              `Expected parentHash: ${previousHeader.blockHash}, ` +
              `Got: ${header.parentHash}`
          );
          // Return the previous header (last valid block before the fork)
          return {forkDetected: true, forkHeader: previousHeader};
        }

        this.unfinalizedBlocks.push(header);
      } catch (e: any) {
        logger.error(`Failed to fetch block ${height} during backfill: ${e.message}`);
        throw new Error(`Failed to backfill missing unfinalized block at height ${height}: ${e.message}`);
      }
    }

    // Validate the next header connects properly to the last backfilled block
    const lastBackfilledHeader = last(this.unfinalizedBlocks);
    if (lastBackfilledHeader && nextHeader.parentHash !== lastBackfilledHeader.blockHash) {
      logger.warn(
        `Fork detected: new block ${nextHeader.blockHeight} doesn't connect to backfilled chain. ` +
          `Expected parentHash: ${lastBackfilledHeader.blockHash}, ` +
          `Got: ${nextHeader.parentHash}`
      );
      // Return the last backfilled header as the fork point
      return {forkDetected: true, forkHeader: lastBackfilledHeader};
    }

    logger.info(`Successfully backfilled ${endHeight - startHeight + 1} missing blocks`);

    return {forkDetected: false};
  }

  private async deleteFinalizedBlock(): Promise<void> {
    if (this.lastCheckedBlockHeight !== undefined && this.lastCheckedBlockHeight < this.finalizedBlockNumber) {
      this.removeFinalized(this.finalizedBlockNumber);
      await this.saveLastFinalizedVerifiedHeight(this.finalizedBlockNumber);
      await this.saveUnfinalizedBlocks(this.unfinalizedBlocks);
    }
    this.lastCheckedBlockHeight = this.finalizedBlockNumber;
  }

  // remove any records less and equal than input finalized blockHeight
  private removeFinalized(blockHeight: number): void {
    this._unfinalizedBlocks = this.unfinalizedBlocks.filter(({blockHeight: height}) => height > blockHeight);
  }

  // find closest record from block heights
  private getClosestRecord(blockHeight: number): Header | undefined {
    // Have the block in the best block, can be verified
    return [...this.unfinalizedBlocks] // Copy so we can reverse
      .reverse() // Reverse the list to find the largest block
      .find(({blockHeight: height}) => height <= blockHeight);
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
          `Block fork found, enqueued un-finalized block at ${lastVerifiableBlock.blockHeight} with hash ${lastVerifiableBlock.blockHash}, actual hash is ${this.finalizedHeader.blockHash}.`
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
        header = await this.blockchainService.getHeaderForHeight(lastVerifiableBlock.blockHeight);
      } else {
        while (lastVerifiableBlock.blockHeight !== header.blockHeight) {
          assert(
            header.parentHash,
            'When iterate back parent hashes to find matching height, we expect parentHash to be exist'
          );
          header = await this.blockchainService.getHeaderForHash(header.parentHash);
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

  protected async getLastCorrectFinalizedBlock(forkedHeader: Header): Promise<Header | undefined> {
    const bestVerifiableBlocks = this.unfinalizedBlocks.filter(
      ({blockHeight}) => blockHeight <= this.finalizedBlockNumber
    );

    let checkingHeader = forkedHeader;

    // Work backwards through the blocks until we find a matching hash
    for (const bestHeader of bestVerifiableBlocks.reverse()) {
      assert(
        bestHeader.blockHeight === checkingHeader.blockHeight,
        'Expect best header and checking header to be at the same height'
      );
      if (bestHeader.blockHash === checkingHeader.blockHash || bestHeader.blockHash === checkingHeader.parentHash) {
        return bestHeader;
      }

      // Get the new parent
      assert(checkingHeader.parentHash, 'Expect checking header parentHash to be exist');
      checkingHeader = await this.blockchainService.getHeaderForHash(checkingHeader.parentHash);
    }

    if (!this.lastCheckedBlockHeight) {
      return undefined;
    }

    return this.blockchainService.getHeaderForHeight(this.lastCheckedBlockHeight);
  }

  // Finds the last POI that had a correct block hash, this is used with the Eth sdk
  protected async findFinalizedUsingPOI(header: Header): Promise<Header> {
    const poiModel = this.storeModelProvider.poi;
    if (!poiModel) {
      throw new Error(POI_NOT_ENABLED_ERROR_MESSAGE);
    }

    let lastHeight = header.blockHeight;

    while (true) {
      const indexedBlocks: ProofOfIndex[] = await poiModel.getPoiBlocksBefore(lastHeight);

      if (!indexedBlocks.length) {
        break;
      }

      // Work backwards to find a block on chain that matches POI
      for (const indexedBlock of indexedBlocks) {
        const chainHeader = await this.blockchainService.getHeaderForHeight(indexedBlock.id);

        // Need to convert to PoiBlock to encode block hash to Uint8Array properly
        const testPoiBlock = PoiBlock.create(
          chainHeader.blockHeight,
          chainHeader.blockHash,
          new Uint8Array(),
          indexedBlock.projectId ?? ''
        );

        // Need isEqual because of Uint8Array type
        if (isEqual(testPoiBlock.chainBlockHash, indexedBlock.chainBlockHash)) {
          return chainHeader;
        }
      }

      // Next page of POI, use height rather than offset/limit as data could change in that time
      lastHeight = indexedBlocks[indexedBlocks.length - 1].id - 1;
    }

    throw new Error('Unable to find a POI block with matching block hash');
  }

  private async saveUnfinalizedBlocks(unfinalizedBlocks: UnfinalizedBlocks): Promise<void> {
    return this.storeModelProvider.metadata.set(METADATA_UNFINALIZED_BLOCKS_KEY, JSON.stringify(unfinalizedBlocks));
  }

  private async saveLastFinalizedVerifiedHeight(height: number): Promise<void> {
    return this.storeModelProvider.metadata.set(METADATA_LAST_FINALIZED_PROCESSED_KEY, height);
  }

  async resetUnfinalizedBlocks(tx?: Transaction): Promise<void> {
    await this.storeModelProvider.metadata.set(METADATA_UNFINALIZED_BLOCKS_KEY, '[]', tx);
    this._unfinalizedBlocks = [];
  }

  async resetLastFinalizedVerifiedHeight(tx?: Transaction): Promise<void> {
    return this.storeModelProvider.metadata.set(METADATA_LAST_FINALIZED_PROCESSED_KEY, null as any, tx);
  }

  //string should be jsonb object
  async getMetadataUnfinalizedBlocks(): Promise<UnfinalizedBlocks> {
    const val = await this.storeModelProvider.metadata.find(METADATA_UNFINALIZED_BLOCKS_KEY);
    if (val) {
      const result: (Header & {timestamp: string})[] = JSON.parse(val);
      return result.map(({timestamp, ...header}) => ({
        ...header,
        timestamp: new Date(timestamp),
      }));
    }
    return [];
  }

  async getLastFinalizedVerifiedHeight(): Promise<number | undefined> {
    return this.storeModelProvider.metadata.find(METADATA_LAST_FINALIZED_PROCESSED_KEY);
  }
}
