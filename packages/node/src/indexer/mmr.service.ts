// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { u8aToHex, u8aEq } from '@polkadot/util';
import { getLogger } from '@subql/node-core';
import { NodeConfig } from '@subql/node-core/configure';
import {
  MetadataFactory,
  MetadataRepo,
  PoiFactory,
  PoiRepo,
  ProofOfIndex,
} from '@subql/node-core/indexer/entities';
import { delay } from '@subql/node-core/utils';
import {
  MMR,
  FileBasedDb,
  keccak256FlyHash,
} from '@subql/x-merkle-mountain-range';
import { Sequelize, Op } from 'sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';

const logger = getLogger('mmr');
const DEFAULT_WORD_SIZE = 32;
const DEFAULT_LEAF = Buffer.from(
  '0000000000000000000000000000000000000000000000000000000000000001',
  'hex',
);
const DEFAULT_FETCH_RANGE = 100;
const MMR_AWAIT_TIME = 2;

@Injectable()
export class MmrService implements OnApplicationShutdown {
  private isShutdown = false;
  private blockOffset: number;
  private metadataRepo: MetadataRepo;
  private fileBasedMmr: MMR;
  private poiRepo: PoiRepo;
  // This is the next block height that suppose to calculate its mmr value
  private nextMmrBlockHeight: number;
  private projectMmrPath: string;

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
    await this.ensureFileBasedMmr(this.nodeConfig.mmrPath);

    // The file based database current leaf length
    const fileBasedMmrLeafLength = await this.fileBasedMmr.getLeafLength();
    // However, when initialization we pick the previous block for file db and poi mmr validation
    // if mmr leaf length 0 ensure the next block height to be processed min is 1.
    this.nextMmrBlockHeight = fileBasedMmrLeafLength + blockOffset + 1;
    // The first Poi in database with null mmr value.
    const poiWithoutMmr = await this.getFirstPoiWithoutMmr();
    // The latest poi record in database with mmr value
    const latestPoiWithMmr = await this.getLatestPoiWithMmr();
    // If can not find the latest record with mmr, then start from the poi without mmr
    // See discussion (https://github.com/subquery/subql/pull/600)
    // This can be undefined as poi table is not ready
    let poiStartHeight: number;
    poiStartHeight = latestPoiWithMmr?.id
      ? latestPoiWithMmr?.id
      : poiWithoutMmr?.id;
    if (latestPoiWithMmr && poiWithoutMmr) {
      // Handle if a missing mmr in a record
      if (poiWithoutMmr.id < latestPoiWithMmr.id) {
        poiStartHeight = poiWithoutMmr.id;
      }
    }
    // Compare and reset values
    if (poiStartHeight && poiStartHeight < this.nextMmrBlockHeight) {
      // Reset file based mmr according to poi table start block height
      await this.resetFileBasedMmr(blockOffset, poiStartHeight);
    } else if (!poiStartHeight && fileBasedMmrLeafLength > 0) {
      // If poi table is not ready, but file based db have mmr already, reset file based db.
      await this.resetFileBasedMmr(blockOffset);
    }
    logger.info(
      `file based database MMR start with block height ${this.nextMmrBlockHeight}`,
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
          await this.appendMmrNode(block, blockOffset);
        }
      } else {
        await delay(MMR_AWAIT_TIME);
      }
    }
  }

  async appendMmrNode(
    poiBlock: ProofOfIndex,
    blockOffset: number,
  ): Promise<void> {
    const newLeaf = poiBlock.hash;
    if (newLeaf.length !== DEFAULT_WORD_SIZE) {
      throw new Error(
        `Append Mmr failed, input data length should be ${DEFAULT_WORD_SIZE}`,
      );
    }
    const estLeafIndexByBlockHeight = poiBlock.id - blockOffset - 1;
    // The next leaf index in mmr, current latest leaf index always .getLeafLength -1.
    await this.fileBasedMmr.append(newLeaf, estLeafIndexByBlockHeight);
    const mmrRoot = await this.fileBasedMmr.getRoot(estLeafIndexByBlockHeight);
    await this.updatePoiMmrRoot(poiBlock.id, mmrRoot);
    this.nextMmrBlockHeight = poiBlock.id + 1;
  }

  async updatePoiMmrRoot(id: number, mmrValue: Uint8Array): Promise<void> {
    const poiBlock = await this.poiRepo.findByPk(id);
    if (poiBlock.mmrRoot === null) {
      poiBlock.mmrRoot = mmrValue;
      await poiBlock.save();
    } else if (!u8aEq(poiBlock.mmrRoot, mmrValue)) {
      throw new Error(
        `Poi block height ${id}, Poi mmr ${u8aToHex(
          poiBlock.mmrRoot,
        )} not same as filebased mmr: ${u8aToHex(mmrValue)}`,
      );
    } else if (u8aEq(poiBlock.mmrRoot, mmrValue)) {
      logger.info(
        `CHECKING : Poi block height ${id}, Poi mmr is same as file based mmr`, //remove for debug
      );
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

  async ensureFileBasedMmr(projectMmrPath: string) {
    this.projectMmrPath = projectMmrPath;
    let fileBasedDb: FileBasedDb;
    if (fs.existsSync(projectMmrPath)) {
      fileBasedDb = await FileBasedDb.open(projectMmrPath);
    } else {
      fileBasedDb = await FileBasedDb.create(projectMmrPath, DEFAULT_WORD_SIZE);
    }
    this.fileBasedMmr = new MMR(keccak256FlyHash, fileBasedDb);
  }

  async resetFileBasedMmr(
    blockOffset: number,
    blockHeight?: number,
  ): Promise<void> {
    await this.fileBasedMmr.delete(
      blockHeight ? blockHeight - blockOffset - 1 : 0,
    );
    this.nextMmrBlockHeight = Math.max(blockHeight, 1);
    logger.info(`Reset mmr start from block height ${this.nextMmrBlockHeight}`);
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
}
