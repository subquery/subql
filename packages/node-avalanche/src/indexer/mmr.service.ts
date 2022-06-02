// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { u8aToHex, u8aEq } from '@polkadot/util';
import { getLogger } from '@subql/common-node';
import { NodeConfig } from '@subql/common-node/configure';
import {
  MetadataFactory,
  MetadataRepo,
  PoiFactory,
  PoiRepo,
  ProofOfIndex,
} from '@subql/common-node/indexer/entities';
import { delay } from '@subql/common-node/utils';
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

  constructor(
    protected nodeConfig: NodeConfig,
    protected project: SubqueryProject,
    protected sequelize: Sequelize,
  ) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  async init(schema: string): Promise<void> {
    this.metadataRepo = MetadataFactory(this.sequelize, schema);
    this.poiRepo = PoiFactory(this.sequelize, schema);
    // Due to mmr height always start from 1, offset value usually equal to indexing start block height - 1.
    // For example, start indexing from block 5, the offset is 4.
    // Which means, the 1st leaf of mmr present 5th indexing block data
    this.blockOffset = await this.fetchBlockOffsetFromDb();
    this.ensureFileBasedMmr(this.nodeConfig.mmrPath);
    // The file based database current leaf length
    const fileBasedMmrLeafLength = await this.fileBasedMmr.getLeafLength();
    // However, when initialization we pick the previous block for file db and poi mmr validation
    // if mmr leaf length 0 ensure the next block height to be processed min is 1.
    this.nextMmrBlockHeight = fileBasedMmrLeafLength + this.blockOffset + 1;
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
      await this.resetFileBasedMmr(poiStartHeight);
    } else if (!poiStartHeight && fileBasedMmrLeafLength > 0) {
      // If poi table is not ready, but file based db have mmr already, reset file based db.
      await this.resetFileBasedMmr();
    }
    logger.info(
      `file based database MMR start with block height ${this.nextMmrBlockHeight}`,
    );
  }

  async fetchBlockOffsetFromDb(): Promise<number | null> {
    const blockOffset = await this.metadataRepo.findOne({
      where: { key: 'blockOffset' },
    });
    if (blockOffset === null) {
      throw new Error(`Poi service failed to fetch block offset from metadata`);
    }
    return Number(blockOffset.value);
  }

  async appendMmrNode(poiBlock: ProofOfIndex): Promise<void> {
    let mmrRoot: Uint8Array;
    const newLeaf = poiBlock.hash;
    if (newLeaf.length !== DEFAULT_WORD_SIZE) {
      throw new Error(
        `Append Mmr failed, input data length should be ${DEFAULT_WORD_SIZE}`,
      );
    }
    // The estimate mmr leaf index from provided poi block height
    const estLeafIndexByBlockHeight = poiBlock.id - this.blockOffset - 1;
    // The next leaf index in mmr, current latest leaf index always .getLeafLength -1.
    const nextLeafIndex = await this.fileBasedMmr.getLeafLength();

    // For example, current provided poi block id is 8, offset is 0, and current mmr have 7 blocks mmr stored in file based mmr
    // In addition, the last block 7 is at mmr index position 6.
    // estLeafIndexByBlockHeight is 7, means we expect block 8 mmr data to be stored in mmr at index position 7.
    // nextLeafIndex is 7, where we calculated from current mmr length.

    // If estLeafIndexByBlockHeight match with nextLeafIndex,
    // means file based db mmr is not head or behind the poi table
    // we are good to add new leaf the estimate mmr index position
    if (estLeafIndexByBlockHeight === nextLeafIndex) {
      // new leaf will be append at mmr index 7
      await this.fileBasedMmr.append(newLeaf, estLeafIndexByBlockHeight);
      mmrRoot = await this.fileBasedMmr.getRoot(estLeafIndexByBlockHeight);
    }
    // When FileBased Mmr index is ahead of Poi table, for example nextLeafIndex is 8
    // which means leaf index 7 already appended in file based db
    // fetch mmr from fd and compare to poi
    else if (estLeafIndexByBlockHeight < nextLeafIndex) {
      mmrRoot = await this.fileBasedMmr.getRoot(estLeafIndexByBlockHeight);
    }
    await this.updatePoiMmrRoot(poiBlock.id, mmrRoot);
    this.nextMmrBlockHeight = poiBlock.id + 1;
  }

  async updatePoiMmrRoot(id: number, mmrValue: Uint8Array) {
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

  async syncFileBaseFromPoi(): Promise<void> {
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
        await delay(MMR_AWAIT_TIME);
      }
    }
  }

  async getPoiBlocksByRange(startHeight: number): Promise<ProofOfIndex[]> {
    const poiBlocks = await this.poiRepo.findAll({
      limit: DEFAULT_FETCH_RANGE,
      where: { id: { [Op.gte]: startHeight } },
      order: [['id', 'ASC']],
    });
    if (poiBlocks.length !== 0) {
      // logger.info(`fetched Poi Blocks: [${poiBlocks[0].id},${poiBlocks[poiBlocks.length-1].id}] `)
      return poiBlocks;
    } else {
      return [];
    }
  }

  ensureFileBasedMmr(projectMmrPath: string) {
    let fileBasedDb: FileBasedDb;
    if (fs.existsSync(projectMmrPath)) {
      fileBasedDb = FileBasedDb.open(projectMmrPath);
    } else {
      fileBasedDb = FileBasedDb.create(projectMmrPath, DEFAULT_WORD_SIZE);
    }
    this.fileBasedMmr = new MMR(keccak256FlyHash, fileBasedDb);
  }

  async resetFileBasedMmr(blockHeight?: number): Promise<void> {
    await this.fileBasedMmr.delete(
      blockHeight ? blockHeight - this.blockOffset - 1 : 0,
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
