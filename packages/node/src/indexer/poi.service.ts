// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import * as path from 'path';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { hexToU8a, u8aConcat } from '@polkadot/util';
import { FileBasedDb, MMR, keccak256FlyHash } from 'merkle-mountain-range';
import { Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { MetadataRepo, MetadataFactory } from './entities/Metadata.entity';
import { PoiFactory, PoiModel, PoiRepo } from './entities/Poi.entity';
import { PoiBlock } from './PoiBlock';

const DEFAULT_PARENT_HASH = hexToU8a('0x00');
const DEFAULT_WORD_SIZE = 32;
interface MmrMeta {
  nodeLength: number;
  leafLength: number;
}
@Injectable()
export class PoiService implements OnApplicationShutdown {
  private isShutdown = false;
  private latestPoiBlockHash: Uint8Array;
  private poiRepo: PoiRepo;
  private metadataRepo: MetadataRepo;
  private blockOffset: number;
  private schema: string;
  private fileBasedMmr: MMR;
  private proofMmr;
  private latestPoiBlock: PoiModel;

  constructor(
    protected nodeConfig: NodeConfig,
    protected project: SubqueryProject,
    protected sequelize: Sequelize,
  ) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  async init(schema: string): Promise<void> {
    this.schema = schema;
    this.poiRepo = PoiFactory(this.sequelize, this.schema);
    this.metadataRepo = MetadataFactory(this.sequelize, this.schema);

    await Promise.all([
      (this.latestPoiBlock = await this.fetchLatestPoiBlockFromDb()),
      (this.latestPoiBlockHash = await this.getLatestPoiBlockHash()), //TODO, extract from latest poi
      (this.blockOffset = await this.fetchBlockOffsetFromDb()),
    ]);

    if (this.latestPoiBlock !== null) {
      const projectMmrPath = path.join(
        process.cwd(),
        `../../mmrs/${this.nodeConfig.subqueryName}.mmr`,
      );
      await this.ensureFileBasedMmr(projectMmrPath);
    }
  }

  async fetchPoiBlockMmrFromDb(
    bLockHeight: number,
  ): Promise<Uint8Array | null> {
    const poi = await this.poiRepo.findByPk(bLockHeight);
    if (poi === null || poi === undefined) {
      return null;
    } else if (poi !== null && poi.mmrRoot) {
      return poi.mmrRoot;
    } else {
      throw new Error(
        `Block #${bLockHeight} Poi found but can not get its mmr `,
      );
    }
  }

  async fetchLatestPoiBlockFromDb(): Promise<PoiModel | null> {
    return this.poiRepo.findOne({
      order: [['id', 'DESC']],
    });
  }

  async fetchPoiBlockHashFromDb(): Promise<Uint8Array | null> {
    const lastPoi = await this.poiRepo.findOne({
      order: [['id', 'DESC']],
    });
    if (lastPoi === null || lastPoi === undefined) {
      return null;
    } else if (lastPoi !== null && lastPoi.hash) {
      return lastPoi.hash;
    } else {
      throw new Error(`Poi found but can not get latest hash`);
    }
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

  async getBlockOffset(): Promise<number> {
    if (!this.blockOffset) {
      this.blockOffset = await this.fetchBlockOffsetFromDb();
    }
    return this.blockOffset;
  }

  async getLatestPoiBlockHash(): Promise<Uint8Array | null> {
    if (!this.latestPoiBlockHash) {
      const poiBlockHash = await this.fetchPoiBlockHashFromDb();
      if (poiBlockHash === null || poiBlockHash === undefined) {
        this.latestPoiBlockHash = DEFAULT_PARENT_HASH;
      } else {
        this.latestPoiBlockHash = poiBlockHash;
      }
    }
    return this.latestPoiBlockHash;
  }

  setLatestPoiBlockHash(hash: Uint8Array): void {
    this.latestPoiBlockHash = hash;
  }

  async appendMmrNode(poiBlock: PoiBlock): Promise<void> {
    //poi as leaf
    const newLeaf = u8aConcat(poiBlock.hash);
    if (newLeaf.length !== DEFAULT_WORD_SIZE) {
      throw new Error(
        `Append Mmr failed, input data lenght should be ${DEFAULT_WORD_SIZE}`,
      );
    }
    await this.fileBasedMmr.append(newLeaf);
  }

  async getFileBaseLatestMmr(): Promise<Buffer> {
    const leafLength: number = await this.fileBasedMmr.getLeafLength();
    const proofMmr = await this.fileBasedMmr.getProof([leafLength - 1]);
    return proofMmr.serialize();
  }

  async getMmrMeta(): Promise<MmrMeta> {
    const nodeLength = await this.fileBasedMmr.getNodeLength();
    const leafLength = await this.fileBasedMmr.getLeafLength();
    return { nodeLength, leafLength };
  }

  async syncFileBaseFromPoi(targetHeight: number) {
    //TODO
  }

  async ensureFileBasedMmr(projectMmrPath: string) {
    let fileBasedDb: FileBasedDb;
    if (fs.existsSync(projectMmrPath)) {
      fileBasedDb = FileBasedDb.open(projectMmrPath);
    } else {
      fileBasedDb = FileBasedDb.openOrCreate(
        projectMmrPath,
        'a+',
        DEFAULT_WORD_SIZE,
      );
    }
    this.fileBasedMmr = new MMR(keccak256FlyHash, fileBasedDb);
    const fdLatestBlockHeight =
      this.fileBasedMmr.getLeafLength() + this.blockOffset;
    const fdLatestMmr = await this.getFileBaseLatestMmr();
    const dbMmr = await this.fetchPoiBlockMmrFromDb(fdLatestBlockHeight);
    if (dbMmr === null) {
      //Unable to find filedb mmr block height in poi table, likely head
      throw new Error(
        `FileDb mmr leaf block height is ahead of Proof-of-index, you need to re-sync`,
      );
    } else if (dbMmr !== fdLatestMmr) {
      //Not match mmr
      throw new Error(
        `At block height ${fdLatestBlockHeight}, MMR value in fileDb is not matching with Proof-of-index, you need to re-sync`,
      );
    } else if (fdLatestBlockHeight < this.latestPoiBlock.id) {
      //if fileDb mmr is correct but behind poi
      await this.syncFileBaseFromPoi(this.latestPoiBlock.id);
    }
  }
}
