// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'worker_threads';
import {Inject, Injectable, OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {DEFAULT_FETCH_RANGE, delay, POI_AWAIT_TIME} from '@subql/common';
import {hexToU8a} from '@subql/utils';
import {QueryTypes} from '@subql/x-sequelize';
import {PoiEvent} from '../../events';
import {getLogger} from '../../logger';
import {ProofOfIndex, SyncedProofOfIndex} from '../entities/Poi.entity';
import {StoreCacheService} from '../storeCache';
import {CachePoiModel} from '../storeCache/cachePoi';
import {ISubqueryProject} from '../types';
import {PoiBlock} from './PoiBlock';

const GENESIS_PARENT_HASH = hexToU8a('0x00');
const logger = getLogger('ProofOfIndex');

const syncingMsg = (start: number, end: number, size: number) =>
  logger.info(`Synced POI [${start} - ${end}] Poi, total ${size} blocks `);

function isSyncedProofOfIndex(poi?: ProofOfIndex | SyncedProofOfIndex): poi is SyncedProofOfIndex {
  return !!poi && !!(poi as SyncedProofOfIndex).parentHash && !!(poi as SyncedProofOfIndex).hash;
}

@Injectable()
export class PoiService implements OnApplicationShutdown {
  private isShutdown = false;
  private _poiRepo?: CachePoiModel;
  private _latestSyncedPoi?: ProofOfIndex;
  private isSyncing = false;

  constructor(
    private storeCache: StoreCacheService,
    private eventEmitter: EventEmitter2,
    @Inject('ISubqueryProject') private project: ISubqueryProject
  ) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get poiRepo(): CachePoiModel {
    if (!this._poiRepo) {
      throw new Error(`No poi repo inited`);
    }
    return this._poiRepo;
  }

  get projectId(): string {
    if (!this.project) {
      throw new Error(`No project inited`);
    }
    return this.project.id;
  }

  get latestSyncedPoi(): SyncedProofOfIndex {
    if (isSyncedProofOfIndex(this._latestSyncedPoi)) {
      return this._latestSyncedPoi;
    } else {
      throw new Error(
        `_latestSyncedPoi height ${
          (this._latestSyncedPoi as SyncedProofOfIndex)?.id
        } in Poi service is not valid. Please check from the db`
      );
    }
  }

  async init(schema: string): Promise<void> {
    this._poiRepo = this.storeCache.poi ?? undefined;
    const latestSyncedPoiHeight = await this.storeCache.metadata.find('latestSyncedPoiHeight');
    if (latestSyncedPoiHeight !== undefined) {
      const recordedPoi = await this.poiRepo.getPoiById(latestSyncedPoiHeight);
      if (recordedPoi) {
        if (isSyncedProofOfIndex(recordedPoi)) {
          await this.setLatestSyncedPoi(recordedPoi);
        } else {
          throw new Error(`Found synced poi at height ${latestSyncedPoiHeight} is not valid, please check DB`);
        }
      } else {
        // TODO, could use sql to find latestSyncedPoiHeight in db
        throw new Error(`Can not find latestSyncedPoiHeight ${latestSyncedPoiHeight}`);
      }
    }
    await this.migratePoi(schema);
  }

  // This could use for a subcommand later
  async migratePoi(schema: string): Promise<void> {
    // No migration needed if latestSyncedPoi is set
    // And it should pass the validation check
    if (this._latestSyncedPoi) {
      return;
    }
    try {
      // Remove and Change column from sequelize not work, it only applies to public schema
      // https://github.com/sequelize/sequelize/issues/13365
      // await this.poiRepo?.model.sequelize?.getQueryInterface().changeColumn(tableName,'mmrRoot',{})
      const tableName = this.poiRepo.model.getTableName().toString();
      const checkAttributesQuery = `SELECT
        (NOT EXISTS (SELECT 1 FROM ${tableName} WHERE "operationHashRoot" IS NOT NULL)) AS operationHashRoot_nullable,
        (NOT EXISTS (SELECT 1 FROM ${tableName} WHERE "chainBlockHash" IS NOT NULL)) AS chainBlockHash_nullable,
        (NOT EXISTS (SELECT 1 FROM ${tableName} WHERE "hash" IS NOT NULL)) AS hash_nullable,
        (NOT EXISTS (SELECT 1 FROM ${tableName} WHERE "parentHash" IS NOT NULL)) AS parent_nullable,
        (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '_poi' AND column_name = 'mmrRoot' AND table_schema = '${schema}' )) AS mmr_exists;`;

      const checkResult = await this.poiRepo.model.sequelize?.query(checkAttributesQuery, {
        plain: true,
      });

      // Drop previous keys in metadata
      this.storeCache.metadata.bulkRemove(['blockOffset', 'latestPoiWithMmr', 'lastPoiHeight']);

      const queries = [];

      if (checkResult) {
        if (checkResult.mmr_exists) {
          queries.push(`ALTER TABLE ${tableName} DROP COLUMN "mmrRoot";`);
          queries.push(`DROP TABLE IF EXISTS "${schema}"."_mmr";`);
        }
        if (!checkResult.chainBlockHash_nullable) {
          queries.push(`ALTER TABLE ${tableName} ALTER COLUMN "operationHashRoot" DROP NOT NULL;`);
        }
        if (!checkResult.chainBlockHash_nullable) {
          queries.push(`ALTER TABLE ${tableName} ALTER COLUMN "chainBlockHash" DROP NOT NULL;`);
          // keep existing chainBlockHash
          queries.push(
            `CREATE UNIQUE INDEX IF NOT EXISTS "poi_chainBlockHash" ON ${tableName} ("hash") WHERE "hash" IS NOT NULL`
          );
        }
        if (!checkResult.hash_nullable) {
          queries.push(`ALTER TABLE ${tableName} ALTER COLUMN "hash" DROP NOT NULL;`);
          queries.push(`UPDATE ${tableName} SET hash = NULL;`);
          queries.push(
            `CREATE UNIQUE INDEX IF NOT EXISTS "poi_hash" ON ${tableName} ("hash") WHERE "hash" IS NOT NULL`
          );
        }
        if (!checkResult.parent_nullable) {
          queries.push(`ALTER TABLE ${tableName} ALTER COLUMN "parentHash" DROP NOT NULL;`);
          queries.push(`UPDATE ${tableName} SET "parentHash" = NULL;`);
          queries.push(
            `CREATE UNIQUE INDEX IF NOT EXISTS "poi_parent_hash" ON ${tableName} ("parentHash") WHERE "parentHash" IS NOT NULL`
          );
        }
      }

      if (queries.length) {
        for (const query of queries) {
          try {
            await this.poiRepo?.model.sequelize?.query(query, {type: QueryTypes.SELECT});
          } catch (e) {
            logger.error(`Migration poi failed with query: ${query}`);
            throw e;
          }
        }
        logger.info(`Successful migrate Poi`);
        if (checkResult?.mmr_exists) {
          logger.info(`If file based mmr were used previously, it can be clean up mannually`);
        }
      }
    } catch (e) {
      throw new Error(`Failed to migrate poi table. {e}`);
    }
    // Before migration `latestSyncedPoiHeight` haven't been record in Db meta
    // we try to find the first height from current poi table. and set for once
    const genesisPoi = await this.poiRepo.getFirst();
    if (genesisPoi && (genesisPoi.hash === null || genesisPoi.parentHash === null)) {
      await this.createGenesisPoi(genesisPoi);
    }
  }

  async ensureGenesisPoi(height: number) {
    if (this._latestSyncedPoi) {
      return;
    }
    const poiBlock = await this.poiRepo.getPoiById(height);
    if (poiBlock === undefined) {
      throw new Error(`Ensure genesis poi failed, could not find poi ${height}`);
    }
    await this.createGenesisPoi(poiBlock);
  }

  async syncPoi(exitHeight?: number, logging?: boolean): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      while (!this.isShutdown) {
        if (!this._latestSyncedPoi) {
          // When genesis poi block is not set yet, this will await
          // Once it set, and `latestSyncedPoi` should also store in _metadata, this delay should never have been triggered, because
          // `latestSyncedPoi` should have been set from `init`.
          await delay(10);
        } else {
          const poiBlocks = await this.poiRepo.getPoiBlocksByRange(this.latestSyncedPoi.id + 1);
          if (exitHeight !== undefined && this.latestSyncedPoi.id > exitHeight) {
            break;
          }
          if (poiBlocks.length !== 0) {
            await this.syncPoiJob(poiBlocks, logging);
          }
          if (poiBlocks.length < DEFAULT_FETCH_RANGE) {
            await delay(POI_AWAIT_TIME);
          }
        }
      }
      this.isSyncing = false;
    } catch (e) {
      throw new Error(`Failed to sync poi: ${e}`);
      this.isSyncing = false;
      process.exit(1);
    }
  }

  private async setLatestSyncedPoi(poiBlock: ProofOfIndex, flush?: boolean): Promise<void> {
    if (this._latestSyncedPoi !== undefined && this.latestSyncedPoi.id >= poiBlock.id) {
      throw new Error(
        `Set latest synced poi out of order, current height ${this.latestSyncedPoi.id}, new height ${poiBlock.id} `
      );
    }
    this._latestSyncedPoi = poiBlock;
    this.storeCache.metadata.set('latestSyncedPoiHeight', poiBlock.id);
    this.eventEmitter.emit(PoiEvent.LatestSyncedPoi, {
      height: poiBlock.id,
      timestamp: Date.now(),
    });
    if (flush) {
      await this.storeCache.flushCache(true);
    }
  }

  private async createGenesisPoi(genesisPoi: ProofOfIndex): Promise<void> {
    const poiBlock = PoiBlock.create(
      genesisPoi.id,
      genesisPoi.chainBlockHash,
      genesisPoi.operationHashRoot,
      this.projectId,
      GENESIS_PARENT_HASH
    );
    this.poiRepo.bulkUpsert([poiBlock]);
    await this.setLatestSyncedPoi(poiBlock, true);
    logger.info(`Genesis Poi created at height ${poiBlock.id}!`);
  }

  private async syncPoiJob(poiBlocks: ProofOfIndex[], logging?: boolean): Promise<void> {
    const appendedBlocks: ProofOfIndex[] = [];
    for (let i = 0; i < poiBlocks.length; i++) {
      const nextBlock = poiBlocks[i];
      if (this.latestSyncedPoi.id >= nextBlock.id) {
        throw new Error(
          `Sync poi block out of order, latest synced poi height ${this.latestSyncedPoi.id}, next poi height ${nextBlock.id}`
        );
      }
      if (this.latestSyncedPoi.id + 1 < nextBlock.id) {
        // Fill the with default block
        this.addDefaultPoiBlocks(nextBlock.id - 1, appendedBlocks);
      }
      const syncedPoiBlock = PoiBlock.create(
        nextBlock.id,
        nextBlock.chainBlockHash,
        nextBlock.operationHashRoot,
        this.projectId,
        this.latestSyncedPoi.hash
      );
      appendedBlocks.push(syncedPoiBlock);
      await this.setLatestSyncedPoi(syncedPoiBlock);
    }
    if (appendedBlocks.length) {
      if (logging) {
        syncingMsg(appendedBlocks[0].id, appendedBlocks[appendedBlocks.length - 1].id, appendedBlocks.length);
      }
      this.poiRepo?.bulkUpsert(appendedBlocks);
    }
  }

  private addDefaultPoiBlocks(endHeight: number, appendedBlocks: ProofOfIndex[]): void {
    for (let i = this.latestSyncedPoi.id + 1; i <= endHeight; i++) {
      const syncedPoiBlock = PoiBlock.create(i, null, null, this.projectId, this.latestSyncedPoi.hash);
      appendedBlocks.push(syncedPoiBlock);
      void this.setLatestSyncedPoi(syncedPoiBlock);
    }
  }
}
