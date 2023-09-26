// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Injectable} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {DatabaseError, Deferrable, Sequelize, Transaction} from '@subql/x-sequelize';
import {sum} from 'lodash';
import {NodeConfig} from '../../configure';
import {IndexerEvent} from '../../events';
import {getLogger} from '../../logger';
import {profiler} from '../../profiler';
import {MetadataRepo, PoiRepo} from '../entities';
import {BaseCacheService} from './baseCache.service';
import {CacheMetadataModel} from './cacheMetadata';
import {CachedModel} from './cacheModel';
import {CachePoiModel} from './cachePoi';
import {ICachedModel, ICachedModelControl} from './types';

const logger = getLogger('StoreCacheService');

@Injectable()
export class StoreCacheService extends BaseCacheService {
  private cachedModels: Record<string, ICachedModelControl> = {};
  private metadataRepo?: MetadataRepo;
  private poiRepo?: PoiRepo;
  private readonly storeCacheThreshold: number;
  private readonly cacheUpperLimit: number;
  private _historical = true;
  private _useCockroachDb?: boolean;
  private _storeOperationIndex = 0;
  private _lastFlushedOperationIndex = 0;
  private _lastFlushTs: Date;

  constructor(private sequelize: Sequelize, private config: NodeConfig, protected eventEmitter: EventEmitter2) {
    super('StoreCache');
    this.storeCacheThreshold = config.storeCacheThreshold;
    this.cacheUpperLimit = config.storeCacheUpperLimit;
    this._lastFlushTs = new Date();

    if (this.storeCacheThreshold > this.cacheUpperLimit) {
      logger.error('Store cache threshold must be less than the store cache upper limit');
      process.exit(1);
    }
  }

  init(historical: boolean, useCockroachDb: boolean, meta: MetadataRepo, poi?: PoiRepo): void {
    this._useCockroachDb = useCockroachDb;
    this._historical = historical;
    this.metadataRepo = meta;
    this.poiRepo = poi;
  }

  getNextStoreOperationIndex(): number {
    this._storeOperationIndex += 1;
    return this._storeOperationIndex;
  }

  getModel<T>(entity: string): ICachedModel<T> {
    if (entity === '_metadata') {
      throw new Error('Please use getMetadataModel instead');
    }
    if (entity === '_poi') {
      throw new Error('Please use getPoiModel instead');
    }
    if (!this.cachedModels[entity]) {
      const model = this.sequelize.model(entity);
      assert(model, `model ${entity} not exists`);
      this.cachedModels[entity] = new CachedModel(
        model,
        this._historical,
        this.config,
        this.getNextStoreOperationIndex.bind(this),
        () => this.flushCache(true),
        this._useCockroachDb
      );
    }
    return this.cachedModels[entity] as unknown as ICachedModel<T>;
  }

  get metadata(): CacheMetadataModel {
    const entity = '_metadata';
    if (!this.cachedModels[entity]) {
      if (!this.metadataRepo) {
        throw new Error('Metadata entity has not been set on store cache');
      }
      this.cachedModels[entity] = new CacheMetadataModel(this.metadataRepo);
    }
    return this.cachedModels[entity] as unknown as CacheMetadataModel;
  }

  get poi(): CachePoiModel | null {
    const entity = '_poi';
    if (!this.cachedModels[entity]) {
      if (!this.poiRepo) {
        return null;
        // throw new Error('Poi entity has not been set on store cache');
      }
      this.cachedModels[entity] = new CachePoiModel(this.poiRepo);
    }

    return this.cachedModels[entity] as unknown as CachePoiModel;
  }

  private async flushRelationalModelsInOrder(updatableModels: ICachedModelControl[], tx: Transaction): Promise<void> {
    const relationalModels = updatableModels.filter((m) => m.hasAssociations);
    // _storeOperationIndex could increase while we are still flushing
    // therefore we need to store this index in memory first.

    const flushToIndex = this._storeOperationIndex;
    for (let i = this._lastFlushedOperationIndex; i < flushToIndex; i++) {
      // Flush operation can be a no-op if it doesn't have that index
      await Promise.all(relationalModels.map((m) => m.flushOperation?.(i, tx)));
    }
    this._lastFlushedOperationIndex = flushToIndex;
  }

  @profiler()
  async _flushCache(flushAll?: boolean): Promise<void> {
    this.logger.debug('Flushing cache');
    // With historical disabled we defer the constraints check so that it doesn't matter what order entities are modified
    const tx = await this.sequelize.transaction({
      deferrable: this._historical || this._useCockroachDb ? undefined : Deferrable.SET_DEFERRED(),
    });
    try {
      // Get the block height of all data we want to flush up to
      const blockHeight = flushAll ? undefined : await this.metadata.find('lastProcessedHeight');
      // Get models that have data to flush
      const updatableModels = Object.values(this.cachedModels).filter((m) => m.isFlushable);
      if (this._useCockroachDb) {
        // 1. Independent(no associations) models can flush simultaneously
        await Promise.all(
          updatableModels.filter((m) => !m.hasAssociations).map((model) => model.flush(tx, blockHeight))
        );
        // 2. Models with associations will flush in orders,
        await this.flushRelationalModelsInOrder(updatableModels, tx);
      } else {
        await Promise.all(updatableModels.map((model) => model.flush(tx, blockHeight)));
      }
      await tx.commit();
    } catch (e: any) {
      if (e instanceof DatabaseError) {
        this.logger.info(`Error: ${e}, Name: ${e.name}, Parent: ${e.parent}, Original: ${e.original}`);
      }
      this.logger.error(e, 'Database transaction failed, rolling back');
      await tx.rollback();
      throw e;
    }
    this._lastFlushTs = new Date();
  }

  _resetCache(): void {
    for (const model of Object.values(this.cachedModels)) {
      model.clear();
    }
  }

  async flushAndWaitForCapacity(forceFlush?: boolean, flushAll?: boolean): Promise<void> {
    const flushableRecords = this.flushableRecords;

    const pendingFlush = this.flushCache(forceFlush, flushAll);

    if (flushableRecords >= this.cacheUpperLimit) {
      await pendingFlush;
    }
  }

  get flushableRecords(): number {
    const numberOfPoiRecords = this.poi?.flushableRecordCounter ?? 0;
    return sum(Object.values(this.cachedModels).map((m) => m.flushableRecordCounter)) + numberOfPoiRecords;
  }

  isFlushable(): boolean {
    const numOfRecords = this.flushableRecords;
    this.eventEmitter.emit(IndexerEvent.StoreCacheRecordsSize, {
      value: numOfRecords,
    });
    const timeBasedFlush = new Date().getTime() - this._lastFlushTs.getTime() > this.config.storeFlushInterval * 1000;
    return numOfRecords >= this.storeCacheThreshold || timeBasedFlush;
  }
}
