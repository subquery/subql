// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Injectable, BeforeApplicationShutdown} from '@nestjs/common';
import {EventEmitter2, OnEvent} from '@nestjs/event-emitter';
import {NodeConfig} from '@subql/node-core/configure';
import {sum} from 'lodash';
import {Sequelize} from 'sequelize';
import {EventPayload, IndexerEvent} from '../../events';
import {getLogger} from '../../logger';
import {MetadataRepo, PoiRepo} from '../entities';
import {CacheMetadataModel} from './cacheMetadata';
import {CachedModel} from './cacheModel';
import {CachePoiModel} from './cachePoi';
import {ICachedModel, ICachedModelControl} from './types';

const logger = getLogger('StoreCache');

@Injectable()
export class StoreCacheService implements BeforeApplicationShutdown {
  private cachedModels: Record<string, ICachedModelControl> = {};
  private metadataRepo: MetadataRepo;
  private poiRepo: PoiRepo;
  private pendingFlush: Promise<void>;
  private storeCacheThreshold: number;

  constructor(private sequelize: Sequelize, private config: NodeConfig, protected eventEmitter: EventEmitter2) {
    this.storeCacheThreshold = config.storeCacheThreshold;
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

      this.cachedModels[entity] = new CachedModel(model);
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

  private async _flushCache(): Promise<void> {
    logger.info('Flushing cache');
    const tx = await this.sequelize.transaction();
    try {
      // Get models that have data to flush
      const updatableModels = Object.values(this.cachedModels).filter((m) => m.isFlushable);

      await Promise.all(updatableModels.map((model) => model.flush(tx)));

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async flushCache(forceFlush?: boolean): Promise<void> {
    // When we force flush, this will ensure not interrupt current block flushing,
    // Force flush will continue after last block flush tx committed.
    if (this.pendingFlush !== undefined) {
      await this.pendingFlush;
    }
    if (this.isFlushable() || forceFlush) {
      this.pendingFlush = this._flushCache();
      await this.pendingFlush;
    }
  }

  isFlushable(): boolean {
    const numOfRecords = sum(Object.values(this.cachedModels).map((m) => m.flushableRecordCounter));
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
    await this.flushCache(true);
    logger.info(`Force flush cache successful!`);
  }
}
