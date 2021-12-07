// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { u8aToHex, u8aEq } from '@polkadot/util';
import {
  MMR,
  FileBasedDb,
  keccak256FlyHash,
} from '@subql/x-merkle-mountain-range';
import { Sequelize, Op } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import { MetadataFactory, MetadataRepo } from './entities/Metadata.entity';
import { PoiFactory, PoiRepo, ProofOfIndex } from './entities/Poi.entity';

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
  private nextMmrHeight: number;

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
    this.blockOffset = await this.fetchBlockOffsetFromDb();
    this.ensureFileBasedMmr(this.nodeConfig.mmrPath);
    this.nextMmrHeight =
      (await this.fileBasedMmr.getLeafLength()) + this.blockOffset;
    logger.info(
      `file based database MMR start with height ${this.nextMmrHeight}`,
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
    const blockLeafHeight = poiBlock.id - this.blockOffset - 1; //leaf index alway -1
    const mmrNextLeafIndex = await this.fileBasedMmr.getLeafLength();
    if (blockLeafHeight === mmrNextLeafIndex) {
      //next mmr append leaf index should be same as block height
      await this.fileBasedMmr.append(newLeaf, blockLeafHeight);
      mmrRoot = await this.fileBasedMmr.getRoot(blockLeafHeight);
    } else if (blockLeafHeight < mmrNextLeafIndex) {
      //when FileBased Mmr height is ahead of Poi table, fetch mmr from fd and compare to poi
      mmrRoot = await this.fileBasedMmr.getRoot(blockLeafHeight);
    }
    await this.updatePoiMmrRoot(poiBlock.id, mmrRoot);
    this.nextMmrHeight = poiBlock.id + 1;
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
    }
  }

  async syncFileBaseFromPoi(): Promise<void> {
    while (!this.isShutdown) {
      const poiBlocks = await this.getPoiBlocksByRange(this.nextMmrHeight);
      if (poiBlocks.length !== 0) {
        for (const block of poiBlocks) {
          if (this.nextMmrHeight + 1 < block.id) {
            for (let i = this.nextMmrHeight + 1; i < block.id; i++) {
              await this.fileBasedMmr.append(DEFAULT_LEAF);
              this.nextMmrHeight = i + 1;
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
}
