// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Inject, Injectable, OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {DEFAULT_FETCH_RANGE, delay, POI_AWAIT_TIME} from '@subql/common';
import {hexToU8a} from '@subql/utils';
import {Sequelize, Transaction} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {establishNewSequelize} from '../../db';
import {PoiEvent} from '../../events';
import {getLogger} from '../../logger';
import {hasValue, Queue} from '../../utils';
import {Metadata, MetadataFactory, MetadataRepo} from '../entities';
import {PoiFactory, ProofOfIndex, SyncedProofOfIndex} from '../entities/Poi.entity';
import {ISubqueryProject} from '../types';
import {PoiBlock} from './PoiBlock';
import {PlainPoiModel} from './poiModel';

const GENESIS_PARENT_HASH = hexToU8a('0x00');
const logger = getLogger('PoiSyncService');

const syncingMsg = (start: number, end: number, size: number) =>
  logger.info(`Synced POI [${start} - ${end}] Poi, total ${size} blocks `);

function isSyncedProofOfIndex(poi?: ProofOfIndex | SyncedProofOfIndex): poi is SyncedProofOfIndex {
  return !!poi && !!(poi as SyncedProofOfIndex).parentHash && !!(poi as SyncedProofOfIndex).hash;
}

/**
 * There are two status of POI:
 * - createdPoi: Poi been created with operationHash, but not include hash and parentHash. Creation of Poi in completed in base-block-dispatcher.
 * - syncedPoi: appended Poi hash and parentHash, and pois should be continuous
 *
 * This PoiSyncService sync Poi from createdPoi to syncedPoi only. And it not uses any cache service.
 */

@Injectable()
export class PoiSyncService implements OnApplicationShutdown {
  private isShutdown = false;
  private _poiRepo?: PlainPoiModel;
  private _metadataRepo?: MetadataRepo;
  private _sequelize?: Sequelize;
  private _latestSyncedPoi?: ProofOfIndex;
  private _lastFlushTs: Date;
  private isSyncing = false;
  private syncedPoiQueue: Queue<ProofOfIndex>;

  constructor(
    protected readonly nodeConfig: NodeConfig,
    private eventEmitter: EventEmitter2,
    @Inject('ISubqueryProject') private project: ISubqueryProject
  ) {
    this.syncedPoiQueue = new Queue(1000);
    this._lastFlushTs = new Date();
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get poiRepo(): PlainPoiModel {
    if (!this._poiRepo) {
      throw new Error(`No poi repo inited`);
    }
    return this._poiRepo;
  }

  get metadataRepo(): MetadataRepo {
    if (!this._metadataRepo) {
      throw new Error(`No metadata repo inited`);
    }
    return this._metadataRepo;
  }

  get sequelize(): Sequelize {
    if (!this._sequelize) {
      throw new Error(`Poi sync service sequelize not inited`);
    }
    return this._sequelize;
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
    this._sequelize = await establishNewSequelize(this.nodeConfig);
    this._poiRepo = new PlainPoiModel(PoiFactory(this.sequelize, schema));
    this._metadataRepo = await MetadataFactory(
      this.sequelize,
      schema,
      false,
      '' //No multi chain involved
    );
    logger.info(`Poi sync service init completed, use independent sequelize connection`);
  }

  async syncPoi(exitHeight?: number): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    // Enable this after rewind
    this.isShutdown = false;
    try {
      while (!this.isShutdown) {
        if (!this._latestSyncedPoi) {
          // Try to sync latestSyncedPoi poi block from db
          await this.syncLatestSyncedPoiFromDb();
          if (this._latestSyncedPoi) {
            continue;
          } else {
            const genesisPoiHeight = await this.ensureGenesisPoi();
            // When genesis poi block is not set yet, this will await
            // Once it set, and `latestSyncedPoi` should also store in _metadata, this delay should never have been triggered, because
            // `latestSyncedPoi` should have been set from `syncLatestSyncedPoiFromDb` on top.
            if (genesisPoiHeight === undefined) {
              await delay(10);
            }
          }
        } else {
          if (this.isFlushable()) {
            await this.flushSyncedBlocks();
          }
          // This only get pois already recorded in the _poi table
          // So we don't have to worry set cached Poi override synced Poi
          const poiBlocks = await this.poiRepo.getPoiBlocksByRange(this.latestSyncedPoi.id + 1);
          if (exitHeight !== undefined && this.latestSyncedPoi.id > exitHeight) {
            break;
          }
          if (poiBlocks.length !== 0) {
            await this.syncPoiJob(poiBlocks);
          }
          // Slows down getPoiBlocksByRange when almost catch up last created poi
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

  /**
   * Wait for current sync job stop, then stop the sync loop
   */
  async stopSync(): Promise<void> {
    this.isShutdown = true;
    return new Promise((resolve) => {
      const id = setInterval(() => {
        if (!this.isSyncing) {
          resolve();
          clearInterval(id);
        }
      }, 200);
    });
  }

  /**
   * Clear any cached data in poi sync service
   * - clear latestSyncedPoi
   * - clear syncedPoiQueue that waiting to be processed
   */
  clear(): void {
    this._latestSyncedPoi = undefined;
    this.syncedPoiQueue.takeAll();
  }

  /**
   * Get the record of latestSyncedPoiHeight in metadata table
   * @private
   */
  private async getMetadataLatestSyncedPoi(): Promise<number | undefined> {
    const record = await this.metadataRepo.findByPk('latestSyncedPoiHeight');
    if (hasValue(record)) {
      return record.toJSON().value as number;
    }
    return;
  }

  /**
   * Get latestSyncedPoi from metadata, and find from the Poi table and set it into the service.
   * This should only been called when service sync been called and _latestSyncedPoi is not set.
   * @private
   */
  private async syncLatestSyncedPoiFromDb(): Promise<void> {
    // Need to re-fetch after rewind, because reindex targetHeight ! == latestSyncedPoiHeight
    const latestSyncedPoiHeight = await this.getMetadataLatestSyncedPoi();
    if (latestSyncedPoiHeight !== undefined) {
      const recordedPoi = await this.poiRepo.getPoiById(latestSyncedPoiHeight);
      if (recordedPoi) {
        if (isSyncedProofOfIndex(recordedPoi)) {
          this.setLatestSyncedPoi(recordedPoi);
        } else {
          throw new Error(`Found synced poi at height ${latestSyncedPoiHeight} is not valid, please check DB`);
        }
      } else {
        throw new Error(`Can not find latestSyncedPoiHeight ${latestSyncedPoiHeight}`);
      }
    }
  }

  /**
   * Read first record from poi table (not cache), then create genesis poi
   * _latestSyncedPoi exist, return if genesis poi been created .
   * @private
   */
  private async ensureGenesisPoi(): Promise<undefined | number> {
    if (this._latestSyncedPoi) {
      return;
    }
    const genesisPoi = await this.poiRepo.getFirst();
    if (genesisPoi) {
      await this.createGenesisPoi(genesisPoi);
      return genesisPoi.id;
    }
  }

  /**
   * Set the _latestSyncedPoi in the Poi sync service, also assert the order
   * @param poiBlock
   * @private
   */
  private setLatestSyncedPoi(poiBlock: ProofOfIndex): void {
    if (this._latestSyncedPoi !== undefined && this.latestSyncedPoi.id >= poiBlock.id) {
      throw new Error(
        `Set latest synced poi out of order, current height ${this.latestSyncedPoi.id}, new height ${poiBlock.id} `
      );
    }
    this._latestSyncedPoi = poiBlock;
    this.eventEmitter.emit(PoiEvent.LatestSyncedPoi, {
      height: poiBlock.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Create Genesis Poi
   * @param genesisPoi
   * @private
   */
  private async createGenesisPoi(genesisPoi: ProofOfIndex): Promise<void> {
    const poiBlock = PoiBlock.create(
      genesisPoi.id,
      genesisPoi.chainBlockHash,
      genesisPoi.operationHashRoot,
      this.projectId,
      GENESIS_PARENT_HASH
    );
    const tx = await this.newTx();
    await this.poiRepo.bulkUpsert([poiBlock], tx);
    await this.updateMetadataSyncedPoi(poiBlock.id, tx);
    await tx.commit();
    logger.info(`Genesis Poi created at height ${poiBlock.id}!`);
  }

  /**
   * Take an array of un-synced Pois, and sync them, add hash & parentHash.
   * If Poi blocks id is not continuous, addDefaultPoiBlocks between them.
   * After sync, setLatestSyncedPoi in memory
   * @param poiBlocks
   * @private
   */
  private async syncPoiJob(poiBlocks: ProofOfIndex[]): Promise<void> {
    // const appendedBlocks: ProofOfIndex[] = [];
    for (let i = 0; i < poiBlocks.length; i++) {
      const nextBlock = poiBlocks[i];
      if (this.latestSyncedPoi.id >= nextBlock.id) {
        throw new Error(
          `Sync poi block out of order, latest synced poi height ${this.latestSyncedPoi.id}, next poi height ${nextBlock.id}`
        );
      }
      if (this.latestSyncedPoi.id + 1 < nextBlock.id) {
        // Fill the with default block
        await this.addDefaultPoiBlocks(nextBlock.id - 1);
      }
      const syncedPoiBlock = PoiBlock.create(
        nextBlock.id,
        nextBlock.chainBlockHash,
        nextBlock.operationHashRoot,
        this.projectId,
        this.latestSyncedPoi.hash
      );
      await this.syncedPoiQueueAppend(syncedPoiBlock);
      this.setLatestSyncedPoi(syncedPoiBlock);
    }
  }

  /**
   * Add default poi from latestSyncedPoi height to endHeight
   * @param endHeight
   * @private
   */
  private async addDefaultPoiBlocks(endHeight: number): Promise<void> {
    for (let i = this.latestSyncedPoi.id + 1; i <= endHeight; i++) {
      const syncedPoiBlock = PoiBlock.create(i, null, null, this.projectId, this.latestSyncedPoi.hash);
      await this.syncedPoiQueueAppend(syncedPoiBlock);
      this.setLatestSyncedPoi(syncedPoiBlock);
    }
  }

  /**
   * Create new sequelize transaction for Synced Poi, also for metadata
   * @private
   */
  private async newTx(): Promise<Transaction> {
    const tx = await this.sequelize.transaction();
    if (!tx) {
      throw new Error(`Create transaction for poi got undefined!`);
    }
    return tx;
  }

  /**
   * Update latestSyncedPoiHeight in Metadata table immediately
   * @param height
   * @param tx
   * @private
   */
  private async updateMetadataSyncedPoi(height: number, tx: Transaction): Promise<void> {
    const ops: Metadata[] = [{key: 'latestSyncedPoiHeight', value: height}];
    await Promise.all([
      this.metadataRepo.bulkCreate(ops, {
        transaction: tx,
        updateOnDuplicate: ['key', 'value'],
      }),
    ]);
  }

  /**
   * Append syncPoi to syncedPoiQueue, check flush If queue is full or overtime, then put input block.
   * @param syncedPoiBlock
   * @private
   */
  private async syncedPoiQueueAppend(syncedPoiBlock: PoiBlock) {
    if (this.isFlushable()) {
      await this.flushSyncedBlocks();
    }
    this.syncedPoiQueue.put(syncedPoiBlock);
  }

  /**
   * Check the poi queue is flushable, either:
   * - syncedPoiQueue is full
   * - over flush threshold time (same as store flush), and the queue is not empty
   * @private
   */
  private isFlushable(): boolean {
    const timeBasedFlush =
      new Date().getTime() - this._lastFlushTs.getTime() > this.nodeConfig.storeFlushInterval * 1000;
    return !this.syncedPoiQueue.freeSpace || (!!this.syncedPoiQueue.size && timeBasedFlush);
  }

  /**
   * Take out synced Poi out from queue and process
   * Upsert to Poi table
   * Also, update last upstarted poi to metadata
   * @private
   */
  private async flushSyncedBlocks(): Promise<void> {
    const syncedPois = this.syncedPoiQueue.takeAll();
    const tx = await this.newTx();
    if (syncedPois.length) {
      syncingMsg(syncedPois[0].id, syncedPois[syncedPois.length - 1].id, syncedPois.length);
      // if (this.nodeConfig.debug) {
      //   syncingMsg(appendedBlocks[0].id, appendedBlocks[appendedBlocks.length - 1].id, appendedBlocks.length);
      // }
      await this.poiRepo.bulkUpsert(syncedPois, tx);
      await this.updateMetadataSyncedPoi(syncedPois[syncedPois.length - 1].id, tx);
    }
    await tx.commit();
    this._lastFlushTs = new Date();
  }
}
