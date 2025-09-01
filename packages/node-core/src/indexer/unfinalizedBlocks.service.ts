// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Inject, Injectable} from '@nestjs/common';
import {Transaction} from '@subql/x-sequelize';
import {isEqual, last} from 'lodash';
import {IBlockchainService} from '../blockchain.service';
import {NodeConfig} from '../configure';
import {Header, IBlock} from '../indexer/types';
import {getLogger} from '../logger';
import {exitWithError} from '../process';
import {mainThreadOnly} from '../utils';
import {ProofOfIndex} from './entities';
import {PoiBlock} from './poi';
import {IStoreModelProvider} from './storeModelProvider';

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
  resetUnfinalizedBlocks(tx?: Transaction): void;
  resetLastFinalizedVerifiedHeight(tx?: Transaction): void;
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
          `Found un-finalized blocks from previous indexing but unverified, rolling back to last finalized block ${rewindHeight}`
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
    if (header) {
      await this.registerUnfinalizedBlock(header);
    }

    const forkedHeader = await this.hasForked();

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

  private async registerUnfinalizedBlock(header: Header): Promise<void> {
    if (header.blockHeight <= this.finalizedBlockNumber) return;

    // Ensure order
    const lastUnfinalizedHeight = last(this.unfinalizedBlocks)?.blockHeight;
    if (lastUnfinalizedHeight !== undefined && lastUnfinalizedHeight + 1 !== header.blockHeight) {
      exitWithError(
        `Unfinalized block is not sequential, lastUnfinalizedBlock='${lastUnfinalizedHeight}', newUnfinalizedBlock='${header.blockHeight}'`,
        logger
      );
    }

    this.unfinalizedBlocks.push(header);
    await this.saveUnfinalizedBlocks(this.unfinalizedBlocks);
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

    // eslint-disable-next-line no-constant-condition
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
