// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import {Injectable, OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {DEFAULT_WORD_SIZE, DEFAULT_LEAF, MMR_AWAIT_TIME, RESET_MMR_BLOCK_BATCH} from '@subql/common';
import {u8aToHex, u8aEq} from '@subql/utils';
import {MMR, FileBasedDb} from '@subql/x-merkle-mountain-range';
import {Op} from '@subql/x-sequelize';
import {keccak256} from 'js-sha3';
import {MmrStoreType, NodeConfig} from '../configure';
import {PoiEvent} from '../events';
import {ensureProofOfIndexId, PlainPoiModel, PoiInterface} from '../indexer/poi';
import {getLogger} from '../logger';
import {delay} from '../utils';
import {ProofOfIndex} from './entities';
import {StoreCacheService, PgMmrCacheService} from './storeCache';
const logger = getLogger('mmr');
const MMR_FLUSH_THRESHOLD = 100;
const LATEST_POI_MMR_NULL_VALUE = '0';

export const keccak256Hash = (...nodeValues: Uint8Array[]) => Buffer.from(keccak256(Buffer.concat(nodeValues)), 'hex');

const syncingMsg = (start: number, end: number, size: number) =>
  logger.info(`Syncing block [${start} - ${end}] mmr, total ${size} blocks `);

export abstract class baseMmrService {
  protected constructor(protected readonly nodeConfig: NodeConfig) {}
  protected _mmrDb?: MMR;
  protected _blockOffset?: number;

  abstract ensureMmr(): Promise<void>;

  protected get mmrDb(): MMR {
    if (!this._mmrDb) {
      throw new Error('MMR Service sync has not been called');
    }
    return this._mmrDb;
  }

  protected get blockOffset(): number {
    if (this._blockOffset === undefined) {
      throw new Error('MMR Service sync has not been called');
    }
    return this._blockOffset;
  }

  protected async ensureFileBasedMmr(projectMmrPath: string): Promise<MMR> {
    let fileBasedDb: FileBasedDb;
    if (fs.existsSync(projectMmrPath)) {
      fileBasedDb = await FileBasedDb.open(projectMmrPath);
    } else {
      fileBasedDb = await FileBasedDb.create(projectMmrPath, DEFAULT_WORD_SIZE);
    }
    return new MMR(keccak256Hash, fileBasedDb);
  }

  async getLatestMmrHeight(): Promise<number> {
    // latest leaf index need fetch from .db, as original method will use cache
    return (await this.mmrDb.db.getLeafLength()) + this.blockOffset;
  }
}

@Injectable()
export class MmrService extends baseMmrService implements OnApplicationShutdown {
  private isShutdown = false;
  private isSyncing = false;
  // This is the next block height that suppose to calculate its mmr value
  private _nextMmrBlockHeight?: number;
  private _poi?: PlainPoiModel;
  constructor(
    nodeConfig: NodeConfig,
    private readonly storeCacheService: StoreCacheService,
    private readonly pgMmrCacheService: PgMmrCacheService,
    protected eventEmitter: EventEmitter2
  ) {
    super(nodeConfig);
  }

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

  private get nextMmrBlockHeight(): number {
    if (!this._nextMmrBlockHeight) {
      throw new Error('MMR Service sync has not been called');
    }
    return this._nextMmrBlockHeight;
  }

  async prepareRegen(blockOffset: number, poi: PlainPoiModel): Promise<void> {
    this._blockOffset = blockOffset;
    await this.ensureMmr();
    this._poi = poi;
  }

  private async syncPoiJob(logging?: boolean): Promise<void> {
    const poiBlocks = await this.poi.getPoiBlocksByRange(this.nextMmrBlockHeight);
    if (poiBlocks.length !== 0) {
      if (logging) {
        syncingMsg(poiBlocks[0].id, poiBlocks[poiBlocks.length - 1].id, poiBlocks.length);
      }
      const appendedBlocks: ProofOfIndex[] = [];
      for (const block of poiBlocks) {
        if (this.nextMmrBlockHeight < block.id) {
          await this.addDefaultLeafWithRange(this.nextMmrBlockHeight, block.id);
        }
        // it is a single mmr node, safe to append without flush here
        appendedBlocks.push(await this.appendMmrNode(block));
        this.eventEmitter.emit(PoiEvent.LastPoiWithMmr, {
          height: block.id,
          timestamp: Date.now(),
        });
        this._nextMmrBlockHeight = block.id + 1;
      }
      // This should be safe, even poi bulkUpsert faild, filebased/postgres db node should already been written and accurate.
      if (appendedBlocks.length) {
        await this.poi.bulkUpsert(appendedBlocks);
        this.storeCacheService.metadata.set(
          'latestPoiWithMmr',
          JSON.stringify(appendedBlocks[appendedBlocks.length - 1])
        );
      }
    }
  }

  // Exit option allow exit when POI is fully sync
  async syncFileBaseFromPoi(blockOffset: number, exitHeight?: number, logging?: boolean): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    await this.ensureMmr();
    this._blockOffset = blockOffset;
    // The mmr database last recorded height
    const dbMmrLatestHeight = await this.getLatestMmrHeight();
    // However, when initialization we pick the previous block for file db and poi mmr validation
    // if mmr leaf length 0 ensure the next block height to be processed min is 1.
    this._nextMmrBlockHeight = dbMmrLatestHeight + 1;
    // The latest poi record in database with mmr value
    // Ensure aligned poi table and file based mmr
    // If cache poi generated mmr haven't success write back to poi table,
    // but latestPoiWithMmr still valid, mmr should delete advanced mmr
    const latestPoiWithMmr = await this.ensureLatestPoi(dbMmrLatestHeight, blockOffset);
    const poiNextMmrHeight = (latestPoiWithMmr?.id ?? blockOffset) + 1;
    // If latestPoiWithMmr got null, should use blockOffset, so next sync height is blockOffset + 1
    if (this.nextMmrBlockHeight > poiNextMmrHeight) {
      await this.deleteMmrNode(poiNextMmrHeight, blockOffset);
      this._nextMmrBlockHeight = poiNextMmrHeight;
    }
    logger.info(`MMR database start with next block height at ${this.nextMmrBlockHeight}`);
    while (!this.isShutdown) {
      await this.syncPoiJob(logging);
      if (exitHeight !== undefined && this.nextMmrBlockHeight > exitHeight) {
        break;
      }
    }
    this.isSyncing = false;
  }

  async syncMetadataLatestPoiWithMmr(): Promise<ProofOfIndex | null> {
    const poiResult = await this.poi.getLatestPoiWithMmr();
    if (poiResult !== null) {
      this.storeCacheService.metadata.set('latestPoiWithMmr', JSON.stringify(poiResult));
    } else {
      // if it is null, means all poi mmr has been reset, we can set this to LATEST_POI_MMR_NULL_VALUE.
      // And it should skip from getLatestPoiWithMmr
      this.storeCacheService.metadata.set('latestPoiWithMmr', LATEST_POI_MMR_NULL_VALUE);
    }
    return poiResult;
  }

  async getLatestPoiWithMmr(): Promise<ProofOfIndex | null> {
    let result: ProofOfIndex | null;
    const latestPoiWithMmr = await this.storeCacheService.metadata.find('latestPoiWithMmr');
    if (latestPoiWithMmr !== undefined && latestPoiWithMmr !== null && latestPoiWithMmr !== LATEST_POI_MMR_NULL_VALUE) {
      try {
        const data = JSON.parse(latestPoiWithMmr);
        // verify this in poi table, should not be too much cost
        // if cost increased, we can use data directly from metadata, but downside is we unable to verify its accuracy
        const poiData = await this.poi.model.findOne({where: {id: data.id} as any});
        if (poiData === null || poiData === undefined) {
          throw new Error(`Metadata recorded latestPoiWithMmr height ${data.id} not found in Poi table`);
        }
        // assertion for mmr field
        if (poiData.mmrRoot === undefined || poiData.mmrRoot === null) {
          throw new Error('Metadata recorded latestPoiWithMmr mmr value got undefined');
        }
        result = poiData.toJSON();
      } catch (e) {
        logger.warn(
          `Convert metadata recorded latestPoiWithMmr mmr having issue, ${e}. Will attempt to get from poi table.`
        );
        result = await this.syncMetadataLatestPoiWithMmr();
      }
    } else {
      result = await this.syncMetadataLatestPoiWithMmr();
    }
    return result;
  }

  // Ensure start height of the latest poi and mmr value is correct
  private async ensureLatestPoi(dbMmrLatestHeight: number, blockOffset: number): Promise<ProofOfIndex | null> {
    // The latest poi record in database with mmr value
    const latestPoiWithMmr = await this.getLatestPoiWithMmr();
    if (latestPoiWithMmr) {
      // ensure poi mmr not beyond of db mmr, if so reset poi mmr to null
      if (latestPoiWithMmr.id > dbMmrLatestHeight) {
        await this.poi.resetPoiMmr(latestPoiWithMmr.id, dbMmrLatestHeight);
        await this.syncMetadataLatestPoiWithMmr();
        await this.storeCacheService.flushCache(true);
        return this.ensureLatestPoi(dbMmrLatestHeight, blockOffset);
      }
      // The latestPoiWithMmr its mmr value in filebase db
      const latestPoiMmrValue = await this.mmrDb.getRoot(latestPoiWithMmr.id - blockOffset - 1);
      this.validatePoiMmr(latestPoiWithMmr, latestPoiMmrValue);
    }
    return latestPoiWithMmr;
  }

  private async addDefaultLeafWithRange(start: number, end: number): Promise<void> {
    for (let i = start; i < end; i++) {
      await this.mmrDb.append(DEFAULT_LEAF);
      this.eventEmitter.emit(PoiEvent.LastPoiWithMmr, {
        height: i,
        timestamp: Date.now(),
      });
      this._nextMmrBlockHeight = i + 1;
      // force flush mmr cache here, avoid too much mmr node created in once
      if (this.nodeConfig.mmrStoreType === MmrStoreType.Postgres && i % MMR_FLUSH_THRESHOLD === 0) {
        await this.pgMmrCacheService.flushCache(true);
      }
    }
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
              await this.addDefaultLeafWithRange(this.nextMmrBlockHeight, poiBlock.id);
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

  async ensureMmr(): Promise<void> {
    if (this._mmrDb) {
      return;
    }
    this._mmrDb =
      this.nodeConfig.mmrStoreType === MmrStoreType.Postgres
        ? await this.ensurePostgresBasedMmr()
        : await this.ensureFileBasedMmr(this.nodeConfig.mmrPath);
  }

  private async ensurePostgresBasedMmr(): Promise<MMR> {
    await this.pgMmrCacheService.init(this.nodeConfig);
    const db = this.pgMmrCacheService.mmrRepo;
    return new MMR(keccak256Hash, db);
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
    // This will reset the leaf length in db, but not remove rest of nodes, because new value will override
    await this.mmrDb.delete(leafIndex);
  }
}
