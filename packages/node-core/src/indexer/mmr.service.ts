// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import {Injectable, OnApplicationShutdown} from '@nestjs/common';
import {u8aToHex, u8aEq} from '@polkadot/util';
import {DEFAULT_WORD_SIZE, DEFAULT_LEAF, MMR_AWAIT_TIME} from '@subql/common';
import {MMR, FileBasedDb} from '@subql/x-merkle-mountain-range';
import {keccak256} from 'js-sha3';
import {NodeConfig} from '../configure';
import {MmrPayload, MmrProof} from '../events';
import {getLogger} from '../logger';
import {delay} from '../utils';
import {ProofOfIndex} from './entities';
import {StoreCacheService} from './storeCache';

const logger = getLogger('mmr');

const keccak256Hash = (...nodeValues: Uint8Array[]) => Buffer.from(keccak256(Buffer.concat(nodeValues)), 'hex');

@Injectable()
export class MmrService implements OnApplicationShutdown {
  private isShutdown = false;
  private isSyncing = false;
  private fileBasedMmr: MMR;
  // This is the next block height that suppose to calculate its mmr value
  private nextMmrBlockHeight: number;
  private blockOffset: number;

  constructor(private nodeConfig: NodeConfig, private storeCacheService: StoreCacheService) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  async syncFileBaseFromPoi(blockOffset: number): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.fileBasedMmr = await this.ensureFileBasedMmr(this.nodeConfig.mmrPath);
    this.blockOffset = blockOffset;

    // The file based database current leaf length
    const fileBasedMmrLeafLength = await this.fileBasedMmr.getLeafLength();
    // However, when initialization we pick the previous block for file db and poi mmr validation
    // if mmr leaf length 0 ensure the next block height to be processed min is 1.
    this.nextMmrBlockHeight = fileBasedMmrLeafLength + blockOffset + 1;
    // The latest poi record in database with mmr value
    const latestPoiWithMmr = await this.storeCacheService.poi.getLatestPoiWithMmr();
    if (latestPoiWithMmr) {
      // The latestPoiWithMmr its mmr value in filebase db
      const latestPoiFilebaseMmrValue = await this.fileBasedMmr.getRoot(latestPoiWithMmr.id - blockOffset - 1);
      this.validatePoiMmr(latestPoiWithMmr, latestPoiFilebaseMmrValue);
      // Ensure aligned poi table and file based mmr
      // If cache poi generated mmr haven't success write back to poi table,
      // but latestPoiWithMmr still valid, mmr should delete advanced mmr
      if (this.nextMmrBlockHeight > latestPoiWithMmr.id + 1) {
        await this.deleteMmrNode(latestPoiWithMmr.id + 1, blockOffset);
        this.nextMmrBlockHeight = latestPoiWithMmr.id + 1;
      }
    }
    logger.info(`file based database MMR start with next block height at ${this.nextMmrBlockHeight}`);
    while (!this.isShutdown) {
      const poiBlocks = await this.storeCacheService.poi.getPoiBlocksByRange(this.nextMmrBlockHeight);
      if (poiBlocks.length !== 0) {
        for (const block of poiBlocks) {
          if (this.nextMmrBlockHeight < block.id) {
            for (let i = this.nextMmrBlockHeight; i < block.id; i++) {
              await this.fileBasedMmr.append(DEFAULT_LEAF);
              this.nextMmrBlockHeight = i + 1;
            }
          }
          await this.appendMmrNode(block);
        }
      } else {
        const {lastPoiHeight, lastProcessedHeight} = await this.storeCacheService.metadata.findMany([
          'lastPoiHeight',
          'lastProcessedHeight',
        ]);

        // this.nextMmrBlockHeight means block before nextMmrBlockHeight-1 already exist in filebase mmr
        if (this.nextMmrBlockHeight > Number(lastPoiHeight) && this.nextMmrBlockHeight <= Number(lastProcessedHeight)) {
          for (let i = this.nextMmrBlockHeight; i <= Number(lastProcessedHeight); i++) {
            await this.fileBasedMmr.append(DEFAULT_LEAF);
            this.nextMmrBlockHeight = i + 1;
          }
        }
        await delay(MMR_AWAIT_TIME);
      }
    }
    this.isSyncing = false;
  }

  private async appendMmrNode(poiBlock: ProofOfIndex): Promise<void> {
    const newLeaf = poiBlock.hash;
    if (newLeaf.length !== DEFAULT_WORD_SIZE) {
      throw new Error(`Append Mmr failed, input data length should be ${DEFAULT_WORD_SIZE}`);
    }
    const estLeafIndexByBlockHeight = poiBlock.id - this.blockOffset - 1;
    // The next leaf index in mmr, current latest leaf index always .getLeafLength -1.
    await this.fileBasedMmr.append(newLeaf, estLeafIndexByBlockHeight);
    const mmrRoot = await this.fileBasedMmr.getRoot(estLeafIndexByBlockHeight);
    this.updatePoiMmrRoot(poiBlock, mmrRoot);
    this.nextMmrBlockHeight = poiBlock.id + 1;
  }

  private validatePoiMmr(poiWithMmr: ProofOfIndex, mmrValue: Uint8Array): void {
    if (!u8aEq(poiWithMmr.mmrRoot, mmrValue)) {
      throw new Error(
        `Poi block height ${poiWithMmr.id}, Poi mmr ${u8aToHex(
          poiWithMmr.mmrRoot
        )} not the same as filebased mmr: ${u8aToHex(mmrValue)}`
      );
    } else {
      logger.info(
        `CHECKING : Poi block height ${poiWithMmr.id}, Poi mmr is same as file based mmr` //remove for debug
      );
    }
  }

  private updatePoiMmrRoot(poiBlock: ProofOfIndex, mmrValue: Uint8Array): void {
    if (!poiBlock.mmrRoot) {
      poiBlock.mmrRoot = mmrValue;
      this.storeCacheService.poi.set(poiBlock);
    } else {
      this.validatePoiMmr(poiBlock, mmrValue);
    }
  }

  private async ensureFileBasedMmr(projectMmrPath: string): Promise<MMR> {
    let fileBasedDb: FileBasedDb;
    if (fs.existsSync(projectMmrPath)) {
      fileBasedDb = await FileBasedDb.open(projectMmrPath);
    } else {
      fileBasedDb = await FileBasedDb.create(projectMmrPath, DEFAULT_WORD_SIZE);
    }
    return new MMR(keccak256Hash, fileBasedDb);
  }

  async getMmr(blockHeight: number): Promise<MmrPayload> {
    const leafIndex = blockHeight - this.blockOffset - 1;
    if (leafIndex < 0) {
      throw new Error(`Parameter blockHeight must greater equal to ${this.blockOffset + 1} `);
    }
    const [mmrResponse, node] = await Promise.all([
      this.fileBasedMmr.getRoot(leafIndex),
      this.fileBasedMmr.get(leafIndex),
    ]);
    return {
      offset: this.blockOffset,
      height: blockHeight,
      mmrRoot: u8aToHex(mmrResponse),
      hash: u8aToHex(node),
    };
  }

  async getLatestMmr(): Promise<MmrPayload> {
    // latest leaf index need fetch from .db, as original method will use cache
    const blockHeight = (await this.fileBasedMmr.db.getLeafLength()) + this.blockOffset;
    return this.getMmr(blockHeight);
  }

  async getLatestMmrProof(): Promise<MmrProof> {
    // latest leaf index need fetch from .db, as original method will use cache
    const blockHeight = (await this.fileBasedMmr.db.getLeafLength()) + this.blockOffset;
    return this.getMmrProof(blockHeight);
  }

  async getMmrProof(blockHeight: number): Promise<MmrProof> {
    const leafIndex = blockHeight - this.blockOffset - 1;
    if (leafIndex < 0) {
      throw new Error(`Parameter blockHeight must greater equal to ${this.blockOffset + 1} `);
    }
    const mmrProof = await this.fileBasedMmr.getProof([leafIndex]);
    const nodes = Object.entries(mmrProof.db.nodes).map(([key, data]) => {
      return {
        node: key,
        hash: u8aToHex(data as Uint8Array),
      };
    });
    return {
      digest: mmrProof.digest.name,
      leafLength: mmrProof.db.leafLength,
      nodes,
    };
  }

  async deleteMmrNode(blockHeight: number, blockOffset: number): Promise<void> {
    this.fileBasedMmr = await this.ensureFileBasedMmr(this.nodeConfig.mmrPath);
    const leafIndex = blockHeight - blockOffset - 1;
    if (leafIndex < 0) {
      throw new Error(`Target block height must greater equal to ${blockOffset + 1} `);
    }
    await this.fileBasedMmr.delete(leafIndex);
  }
}
