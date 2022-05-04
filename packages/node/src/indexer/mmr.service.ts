// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { u8aToHex, u8aEq } from '@polkadot/util';
import { DEFAULT_WORD_SIZE, DEFAULT_LEAF, MMR_AWAIT_TIME } from '@subql/common';
import {
  MMR,
  FileBasedDb,
  keccak256FlyHash,
} from '@subql/x-merkle-mountain-range';
import { Sequelize, Op } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import { MetadataFactory, MetadataRepo } from './entities/Metadata.entity';
import { PoiFactory, PoiRepo, ProofOfIndex } from './entities/Poi.entity';
import { MmrPayload } from './events';
const logger = getLogger('mmr');

const DEFAULT_FETCH_RANGE = 100;

@Injectable()
export class MmrService implements OnApplicationShutdown {
  private isShutdown = false;
  private metadataRepo: MetadataRepo;
  private fileBasedMmr: MMR;
  private poiRepo: PoiRepo;
  // This is the next block height that suppose to calculate its mmr value
  private nextMmrBlockHeight: number;
  private blockOffset: number;

  constructor(
    protected nodeConfig: NodeConfig,
    protected project: SubqueryProject,
    protected sequelize: Sequelize,
  ) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  async syncFileBaseFromPoi(
    schema: string,
    blockOffset: number,
  ): Promise<void> {
    this.metadataRepo = MetadataFactory(this.sequelize, schema);
    this.poiRepo = PoiFactory(this.sequelize, schema);
    this.fileBasedMmr = await this.ensureFileBasedMmr(this.nodeConfig.mmrPath);
    this.blockOffset = blockOffset;

    // The file based database current leaf length
    const fileBasedMmrLeafLength = await this.fileBasedMmr.getLeafLength();
    // However, when initialization we pick the previous block for file db and poi mmr validation
    // if mmr leaf length 0 ensure the next block height to be processed min is 1.
    this.nextMmrBlockHeight = fileBasedMmrLeafLength + blockOffset + 1;
    // The first Poi in database with null mmr value.
    // const poiWithoutMmr = await this.getFirstPoiWithoutMmr();
    // The latest poi record in database with mmr value
    const latestPoiWithMmr = await this.getLatestPoiWithMmr();
    if (latestPoiWithMmr) {
      // The latestPoiWithMmr its mmr value in filebase db
      const latestPoiFilebaseMmrValue = await this.fileBasedMmr.getRoot(
        latestPoiWithMmr.id - blockOffset - 1,
      );
      this.validatePoiMmr(latestPoiWithMmr, latestPoiFilebaseMmrValue);
    }
    logger.info(
      `file based database MMR start with next block height at ${this.nextMmrBlockHeight}`,
    );
    while (!this.isShutdown) {
      const poiBlocks = await this.getPoiBlocksByRange(this.nextMmrBlockHeight);
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
        const keys = ['lastProcessedHeight', 'lastPoiHeight'] as const;
        const entries = await this.metadataRepo.findAll({
          where: {
            key: keys,
          },
        });
        const keyValue = entries.reduce((arr, curr) => {
          arr[curr.key] = curr.value;
          return arr;
        }, {} as { [key in typeof keys[number]]: string | boolean | number });

        if (keyValue.lastProcessedHeight > keyValue.lastPoiHeight) {
          // this.nextMmrBlockHeight means block before nextMmrBlockHeight-1 already exist in filebase mmr
          if (
            this.nextMmrBlockHeight > Number(keyValue.lastPoiHeight) &&
            this.nextMmrBlockHeight < Number(keyValue.lastProcessedHeight)
          ) {
            for (
              let i = this.nextMmrBlockHeight;
              i <= Number(keyValue.lastProcessedHeight);
              i++
            ) {
              await this.fileBasedMmr.append(DEFAULT_LEAF);
              this.nextMmrBlockHeight = i + 1;
            }
          }
        }

        await delay(MMR_AWAIT_TIME);
      }
    }
  }

  async appendMmrNode(poiBlock: ProofOfIndex): Promise<void> {
    const newLeaf = poiBlock.hash;
    if (newLeaf.length !== DEFAULT_WORD_SIZE) {
      throw new Error(
        `Append Mmr failed, input data length should be ${DEFAULT_WORD_SIZE}`,
      );
    }
    const estLeafIndexByBlockHeight = poiBlock.id - this.blockOffset - 1;
    // The next leaf index in mmr, current latest leaf index always .getLeafLength -1.
    await this.fileBasedMmr.append(newLeaf, estLeafIndexByBlockHeight);
    const mmrRoot = await this.fileBasedMmr.getRoot(estLeafIndexByBlockHeight);
    await this.updatePoiMmrRoot(poiBlock.id, mmrRoot);
    this.nextMmrBlockHeight = poiBlock.id + 1;
  }

  validatePoiMmr(poiWithMmr: ProofOfIndex, mmrValue: Uint8Array) {
    if (!u8aEq(poiWithMmr.mmrRoot, mmrValue)) {
      throw new Error(
        `Poi block height ${poiWithMmr.id}, Poi mmr ${u8aToHex(
          poiWithMmr.mmrRoot,
        )} not same as filebased mmr: ${u8aToHex(mmrValue)}`,
      );
    } else {
      logger.info(
        `CHECKING : Poi block height ${poiWithMmr.id}, Poi mmr is same as file based mmr`, //remove for debug
      );
    }
  }

  async updatePoiMmrRoot(id: number, mmrValue: Uint8Array): Promise<void> {
    const poiBlock = await this.poiRepo.findByPk(id);
    if (poiBlock.mmrRoot === null) {
      poiBlock.mmrRoot = mmrValue;
      await poiBlock.save();
    } else {
      this.validatePoiMmr(poiBlock, mmrValue);
    }
  }

  async getPoiBlocksByRange(startHeight: number): Promise<ProofOfIndex[]> {
    const poiBlocks = await this.poiRepo.findAll({
      limit: DEFAULT_FETCH_RANGE,
      where: { id: { [Op.gte]: startHeight } },
      order: [['id', 'ASC']],
    });
    if (poiBlocks.length !== 0) {
      return poiBlocks;
    } else {
      return [];
    }
  }

  async getLatestPoiWithMmr(): Promise<ProofOfIndex> {
    const poiBlock = await this.poiRepo.findOne({
      order: [['id', 'DESC']],
      where: { mmrRoot: { [Op.ne]: null } },
    });
    return poiBlock;
  }

  async getFirstPoiWithoutMmr(): Promise<ProofOfIndex> {
    const poiBlock = await this.poiRepo.findOne({
      order: [['id', 'ASC']],
      where: { mmrRoot: { [Op.eq]: null } },
    });
    return poiBlock;
  }

  async ensureFileBasedMmr(projectMmrPath: string): Promise<MMR> {
    let fileBasedDb: FileBasedDb;
    if (fs.existsSync(projectMmrPath)) {
      fileBasedDb = await FileBasedDb.open(projectMmrPath);
    } else {
      fileBasedDb = await FileBasedDb.create(projectMmrPath, DEFAULT_WORD_SIZE);
    }
    return new MMR(keccak256FlyHash, fileBasedDb);
  }

  async getMmr(blockHeight: number): Promise<MmrPayload> {
    const leafIndex = blockHeight - this.blockOffset - 1;
    const value = await this.fileBasedMmr.getRoot(leafIndex);
    return { leafIndex, blockHeight: blockHeight, value };
  }

  async getLatestMmr(): Promise<MmrPayload> {
    // latest leaf index need fetch from .db, as original method will use cache
    const leafIndex = (await this.fileBasedMmr.db.getLeafLength()) - 1;
    const value = await this.fileBasedMmr.getRoot(leafIndex);
    return { leafIndex, blockHeight: leafIndex + this.blockOffset + 1, value };
  }
}
