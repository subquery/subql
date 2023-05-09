// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Injectable, BeforeApplicationShutdown} from '@nestjs/common';
import {EventEmitter2, OnEvent} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {sum} from 'lodash';
import {Deferrable, Sequelize, Transaction} from 'sequelize';
import {NodeConfig} from '../../configure';
import {EventPayload, IndexerEvent} from '../../events';
import {getLogger} from '../../logger';
import {MetadataRepo, PoiRepo} from '../entities';
import {CacheMetadataModel} from './cacheMetadata';
import {CachedModel} from './cacheModel';
import {CachePoiModel} from './cachePoi';
import {ICachedModel, ICachedModelControl} from './types';

const logger = getLogger('StoreCache');

const INTERVAL_NAME = 'cacheFlushInterval';

@Injectable()
export class StoreCacheService implements BeforeApplicationShutdown {
  private cachedModels: Record<string, ICachedModelControl> = {};
  private metadataRepo?: MetadataRepo;
  private poiRepo?: PoiRepo;
  private pendingFlush?: Promise<void>;
  private queuedFlush?: Promise<void>;
  private storeCacheThreshold: number;
  private _historical = true;
  private _useCockroachDb?: boolean;
  private _storeOperationIndex = 0;
  private _lastFlushedOperationIndex = 0;

  constructor(
    private sequelize: Sequelize,
    private config: NodeConfig,
    protected eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry
  ) {
    this.storeCacheThreshold = config.storeCacheThreshold;

    const interval = setInterval(
      () => void this.flushCache(true, false),
      config.storeFlushInterval * 1000 // Convert to miliseconds
    );
    this.schedulerRegistry.addInterval(INTERVAL_NAME, interval);
  }

  init(historical: boolean, useCockroachDb: boolean): void {
    this._useCockroachDb = useCockroachDb;
    this._historical = historical;
  }

  getNextStoreOperationIndex(): number {
    this._storeOperationIndex += 1;
    return this._storeOperationIndex;
  }

  setRepos(meta: MetadataRepo, poi?: PoiRepo): void {
    this.metadataRepo = meta;
    this.poiRepo = poi;
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
      const cacheModel = new CachedModel(model, this._historical, this.config, this._useCockroachDb);
      cacheModel.init(this.getNextStoreOperationIndex.bind(this));
      this.cachedModels[entity] = cacheModel;
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

  private async _flushCache(flushAll?: boolean): Promise<void> {
    logger.debug('Flushing cache');
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
      logger.error(e, 'Database transaction failed');
      await tx.rollback();
      throw e;
    }
  }

  async flushCache(forceFlush?: boolean, flushAll?: boolean): Promise<void> {
    // Awaits any existing flush
    const flushCacheGuarded = async (forceFlush?: boolean): Promise<void> => {
      // When we force flush, this will ensure not interrupt current block flushing,
      // Force flush will continue after last block flush tx committed.
      if (this.pendingFlush !== undefined) {
        await this.pendingFlush;
      }
      if (this.isFlushable() || forceFlush) {
        this.pendingFlush = this._flushCache(flushAll);

        // Remove reference to pending flush once it completes
        this.pendingFlush.finally(() => (this.pendingFlush = undefined));

        await this.pendingFlush;
      }
    };

    // Queued flush ensures that we only prepare one more task to flush, successive calls will return the same promise
    if (this.queuedFlush === undefined) {
      this.queuedFlush = flushCacheGuarded(forceFlush);

      this.queuedFlush.finally(() => (this.queuedFlush = undefined));
    }

    return this.queuedFlush;
  }

  isFlushable(): boolean {
    const numberOfPoiRecords = this.poi?.flushableRecordCounter ?? 0;
    const numOfRecords =
      sum(Object.values(this.cachedModels).map((m) => m.flushableRecordCounter)) + numberOfPoiRecords;
    this.eventEmitter.emit(IndexerEvent.StoreCacheRecordsSize, {
      value: numOfRecords,
    });
    return numOfRecords >= this.storeCacheThreshold;
  }

  @OnEvent(IndexerEvent.BlockQueueSize)
  dynamicUpdateCacheThreshold({value}: EventPayload<number>): void {
    // Ratio of number block left in block queue to queue size
    // Lesser number of number block left in block queue means we are processing faster
    // Therefore we should reduce threshold to flush more frequently
    const waitingProcessingRatio = value / (this.config.batchSize * 3);
    this.storeCacheThreshold = Math.max(1, Number(waitingProcessingRatio * this.config.storeCacheThreshold));
    this.eventEmitter.emit(IndexerEvent.StoreCacheThreshold, {
      value: this.storeCacheThreshold,
    });
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.schedulerRegistry.deleteInterval(INTERVAL_NAME);
    await this.flushCache(true);
    logger.info(`Force flush cache successful!`);
  }
}
