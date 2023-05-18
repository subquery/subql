// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import fs from 'fs';
import {Injectable, OnApplicationShutdown} from '@nestjs/common';
import {DEFAULT_WORD_SIZE, DEFAULT_LEAF, MMR_AWAIT_TIME, RESET_MMR_BLOCK_BATCH} from '@subql/common';
import {u8aToHex, u8aEq} from '@subql/utils';
import {MMR, FileBasedDb} from '@subql/x-merkle-mountain-range';
import {keccak256} from 'js-sha3';
import {Op, Sequelize} from 'sequelize';
import {MmrStoreType, NodeConfig} from '../configure';
import {MmrPayload, MmrProof} from '../events';
import {ensureProofOfIndexId, PlainPoiModel, PoiInterface} from '../indexer/poi';
import {getLogger} from '../logger';
import {delay, getExistingProjectSchema} from '../utils';
import {ProofOfIndex} from './entities';
import {PgBasedMMRDB} from './postgresMmrDb';
import {StoreCacheService} from './storeCache';
const logger = getLogger('mmr');

const keccak256Hash = (...nodeValues: Uint8Array[]) => Buffer.from(keccak256(Buffer.concat(nodeValues)), 'hex');

const syncingMsg = (start: number, end: number, size: number) =>
  logger.info(`Syncing block [${start} - ${end}] mmr, total ${size} blocks `);

@Injectable()
export class MmrService implements OnApplicationShutdown {
  private isShutdown = false;
  private isSyncing = false;
  private _mmrDb?: MMR;
  // This is the next block height that suppose to calculate its mmr value
  private _nextMmrBlockHeight?: number;
  private _blockOffset?: number;
  private _poi?: PlainPoiModel;

  constructor(
    private readonly nodeConfig: NodeConfig,
    private readonly storeCacheService: StoreCacheService,
    private readonly sequelize: Sequelize
  ) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get poi(): PoiInterface {
    if (this._poi) {
      return this._poi;
    }
    const poi = this.storeCacheService.poi;
    if (!poi) {
      throw new Error('MMR service expected POI but it was not found');
    }
    return poi;
  }

  private get mmrDb(): MMR {
    if (!this._mmrDb) {
      throw new Error('MMR Service sync has not been called');
    }
    return this._mmrDb;
  }

  private get nextMmrBlockHeight(): number {
    if (!this._nextMmrBlockHeight) {
      throw new Error('MMR Service sync has not been called');
    }
    return this._nextMmrBlockHeight;
  }

  private get blockOffset(): number {
    if (this._blockOffset === undefined) {
      throw new Error('MMR Service sync has not been called');
    }
    return this._blockOffset;
  }

  async init(blockOffset: number, poi: PlainPoiModel): Promise<void> {
    this._blockOffset = blockOffset;
    await this.ensureMmr();
    this._poi = poi;
  }

  // Exit option allow exit when POI is fully sync
  async syncFileBaseFromPoi(blockOffset: number, exitHeight?: number, logging?: boolean): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    await this.ensureMmr();
    this._blockOffset = blockOffset;
    // The mmr database current leaf length
    const mmrLeafLength = await this.mmrDb.getLeafLength();
    // However, when initialization we pick the previous block for file db and poi mmr validation
    // if mmr leaf length 0 ensure the next block height to be processed min is 1.
    this._nextMmrBlockHeight = mmrLeafLength + blockOffset + 1;
    // The latest poi record in database with mmr value
    const latestPoiWithMmr = await this.poi.getLatestPoiWithMmr();
    if (latestPoiWithMmr) {
      // The latestPoiWithMmr its mmr value in filebase db
      const latestPoiMmrValue = await this.mmrDb.getRoot(latestPoiWithMmr.id - blockOffset - 1);
      this.validatePoiMmr(latestPoiWithMmr, latestPoiMmrValue);
      // Ensure aligned poi table and file based mmr
      // If cache poi generated mmr haven't success write back to poi table,
      // but latestPoiWithMmr still valid, mmr should delete advanced mmr
      if (this.nextMmrBlockHeight > latestPoiWithMmr.id + 1) {
        await this.deleteMmrNode(latestPoiWithMmr.id + 1, blockOffset);
        this._nextMmrBlockHeight = latestPoiWithMmr.id + 1;
      }
    }
    logger.info(`MMR database start with next block height at ${this.nextMmrBlockHeight}`);
    while (!this.isShutdown) {
      const poiBlocks = await this.poi.getPoiBlocksByRange(this.nextMmrBlockHeight);
      if (poiBlocks.length !== 0) {
        if (logging) {
          syncingMsg(poiBlocks[0].id, poiBlocks[poiBlocks.length - 1].id, poiBlocks.length);
        }
        const appendedBlocks = [];
        for (const block of poiBlocks) {
          if (this.nextMmrBlockHeight < block.id) {
            for (let i = this.nextMmrBlockHeight; i < block.id; i++) {
              await this.mmrDb.append(DEFAULT_LEAF);
              this._nextMmrBlockHeight = i + 1;
            }
          }
          appendedBlocks.push(await this.appendMmrNode(block));
          this._nextMmrBlockHeight = block.id + 1;
        }
        // This should be safe, even poi bulkUpsert faild, filebased/postgres db node should already been written and accurate.
        if (appendedBlocks.length) {
          await this.poi.bulkUpsert(appendedBlocks);
        }
      } else {
        const {lastPoiHeight, lastProcessedHeight} = await this.storeCacheService.metadata.findMany([
          'lastPoiHeight',
          'lastProcessedHeight',
        ]);
        // this.nextMmrBlockHeight means block before nextMmrBlockHeight-1 already exist in filebase mmr
        if (this.nextMmrBlockHeight > Number(lastPoiHeight) && this.nextMmrBlockHeight <= Number(lastProcessedHeight)) {
          if (logging) {
            syncingMsg(
              this.nextMmrBlockHeight,
              Number(lastProcessedHeight),
              Math.max(1, Number(lastProcessedHeight) - this.nextMmrBlockHeight)
            );
          }
          for (let i = this.nextMmrBlockHeight; i <= Number(lastProcessedHeight); i++) {
            await this.mmrDb.append(DEFAULT_LEAF);
            this._nextMmrBlockHeight = i + 1;
          }
        }
        await delay(MMR_AWAIT_TIME);
      }
      if (exitHeight !== undefined && this.nextMmrBlockHeight > exitHeight) {
        break;
      }
    }
    this.isSyncing = false;
  }

  private async appendMmrNode(poiBlock: ProofOfIndex): Promise<ProofOfIndex> {
    const newLeaf = poiBlock.hash;
    if (newLeaf.length !== DEFAULT_WORD_SIZE) {
      throw new Error(`Append Mmr failed, input data length should be ${DEFAULT_WORD_SIZE}`);
    }
    const estLeafIndexByBlockHeight = poiBlock.id - this.blockOffset - 1;
    // The next leaf index in mmr, current latest leaf index always .getLeafLength -1.
    await this.mmrDb.append(newLeaf, estLeafIndexByBlockHeight);
    const mmrRoot = await this.mmrDb.getRoot(estLeafIndexByBlockHeight);
    return this.updatePoiMmrRoot(poiBlock, mmrRoot);
  }

  async poiMmrToDb(latestDbMmrHeight: number, targetHeight: number): Promise<void> {
    if (latestDbMmrHeight === targetHeight) {
      return;
    }
    let latest = latestDbMmrHeight;
    this._nextMmrBlockHeight = latest + 1;
    try {
      while (latest <= targetHeight) {
        const results = (
          await this.poi.model.findAll({
            limit: RESET_MMR_BLOCK_BATCH,
            where: {id: {[Op.lte]: targetHeight, [Op.gt]: latest}, mmrRoot: {[Op.ne]: null}} as any,
            order: [['id', 'ASC']],
          })
        ).map((r) => ensureProofOfIndexId(r?.toJSON<ProofOfIndex>()));
        if (results.length) {
          logger.info(
            `Upsert block [${results[0].id} - ${results[results.length - 1].id}] mmr to ${
              this.nodeConfig.mmrStoreType
            } DB, total ${results.length} blocks `
          );
          for (const poiBlock of results) {
            if (this.nextMmrBlockHeight < poiBlock.id) {
              for (let i = this.nextMmrBlockHeight; i < poiBlock.id; i++) {
                await this.mmrDb.append(DEFAULT_LEAF);
                this._nextMmrBlockHeight = i + 1;
              }
            }
            const estLeafIndexByBlockHeight = poiBlock.id - this.blockOffset - 1;
            if (!poiBlock?.hash) {
              throw new Error(`Copy POI block ${poiBlock?.id} hash to DB got undefined`);
            }
            await this.mmrDb.append(poiBlock?.hash, estLeafIndexByBlockHeight);
            this._nextMmrBlockHeight = poiBlock.id + 1;
          }
          latest = results[results.length - 1].id;
        } else {
          break;
        }
      }
    } catch (e) {
      throw new Error(`When try to copy POI mmr to ${this.nodeConfig.mmrStoreType} DB got problem: ${e}`);
    }
  }

  private validatePoiMmr(poiWithMmr: ProofOfIndex, mmrValue: Uint8Array): void {
    if (!poiWithMmr.mmrRoot) {
      throw new Error(`Poi block height ${poiWithMmr.id}, Poi mmr has not been set`);
    } else if (!u8aEq(poiWithMmr.mmrRoot, mmrValue)) {
      throw new Error(
        `Poi block height ${poiWithMmr.id}, Poi mmr ${u8aToHex(poiWithMmr.mmrRoot)} not the same as mmr db: ${u8aToHex(
          mmrValue
        )}`
      );
    } else {
      logger.info(
        `CHECKING : Poi block height ${poiWithMmr.id}, Poi mmr is same as mmr db` //remove for debug
      );
    }
  }

  private updatePoiMmrRoot(poiBlock: ProofOfIndex, mmrValue: Uint8Array): ProofOfIndex {
    if (!poiBlock.mmrRoot) {
      poiBlock.mmrRoot = mmrValue;
    } else {
      this.validatePoiMmr(poiBlock, mmrValue);
    }
    return poiBlock;
  }

  private async ensureMmr(): Promise<void> {
    this._mmrDb =
      this.nodeConfig.mmrStoreType === MmrStoreType.Postgres
        ? await this.ensurePostgresBasedMmr()
        : await this.ensureFileBasedMmr(this.nodeConfig.mmrPath);
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

  private async ensurePostgresBasedMmr(): Promise<MMR> {
    const schema = await getExistingProjectSchema(this.nodeConfig, this.sequelize);
    assert(schema, 'Unable to check for MMR table, schema is undefined');
    const postgresBasedDb = await PgBasedMMRDB.create(this.sequelize, schema);
    return new MMR(keccak256Hash, postgresBasedDb);
  }

  async getMmr(blockHeight: number): Promise<MmrPayload> {
    const leafIndex = blockHeight - this.blockOffset - 1;
    if (leafIndex < 0) {
      throw new Error(`Parameter blockHeight must greater equal to ${this.blockOffset + 1} `);
    }
    const [mmrResponse, node] = await Promise.all([this.mmrDb.getRoot(leafIndex), this.mmrDb.get(leafIndex)]);
    return {
      offset: this.blockOffset,
      height: blockHeight,
      mmrRoot: u8aToHex(mmrResponse),
      hash: u8aToHex(node),
    };
  }

  async getLatestMmr(): Promise<MmrPayload> {
    // latest leaf index need fetch from .db, as original method will use cache
    return this.getMmr(await this.getLatestMmrHeight());
  }

  async getLatestMmrProof(): Promise<MmrProof> {
    return this.getMmrProof(await this.getLatestMmrHeight());
  }

  async getLatestMmrHeight(): Promise<number> {
    // latest leaf index need fetch from .db, as original method will use cache
    return (await this.mmrDb.db.getLeafLength()) + this.blockOffset;
  }

  async getMmrProof(blockHeight: number): Promise<MmrProof> {
    const leafIndex = blockHeight - this.blockOffset - 1;
    if (leafIndex < 0) {
      throw new Error(`Parameter blockHeight must greater equal to ${this.blockOffset + 1} `);
    }
    const mmrProof = await this.mmrDb.getProof([leafIndex]);
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

  async deleteMmrNode(blockHeight: number, blockOffset?: number): Promise<void> {
    await this.ensureMmr();
    if (blockOffset === undefined) {
      throw new Error(`Block offset got undefined when delete mmr node`);
    }
    const leafIndex = blockHeight - blockOffset - 1;
    if (leafIndex < 0) {
      throw new Error(`Target block height must greater equal to ${blockOffset + 1} `);
    }
    await this.mmrDb.delete(leafIndex);
  }
}
