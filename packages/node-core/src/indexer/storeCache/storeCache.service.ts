// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Injectable, OnApplicationShutdown} from '@nestjs/common';
import {NodeConfig} from '@subql/node-core/configure';
import {sum} from 'lodash';
import {Sequelize} from 'sequelize';
import {getLogger} from '../../logger';
import {MetadataRepo, PoiRepo} from '../entities';
import {CacheMetadataModel} from './cacheMetadata';
import {CachedModel} from './cacheModel';
import {CachePoiModel} from './cachePoi';
import {ICachedModel, ICachedModelControl} from './types';

const logger = getLogger('StoreCache');

@Injectable()
export class StoreCacheService implements OnApplicationShutdown {
  private cachedModels: Record<string, ICachedModelControl> = {};
  private metadataRepo: MetadataRepo;
  private poiRepo: PoiRepo;

  constructor(private sequelize: Sequelize, private config: NodeConfig) {
    this.resetMemoryStore();
  }

  setRepos(meta: MetadataRepo, poi?: PoiRepo): void {
    this.metadataRepo = meta;
    this.poiRepo = poi;
  }

  getModel<T>(entity: string): ICachedModel<T> {
    if (entity === '_metadata') {
      throw new Error('Please use getMetadataModel instead');
    }
    if (entity === 'poi') {
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
    const entity = 'poi';
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
    if (this.isFlushable() || forceFlush) {
      await this._flushCache();
      // Note flushCache and commit transaction need to sequential
      // await this.commitTransaction();
      this.resetMemoryStore();
    }
  }

  isFlushable(): boolean {
    const numOfRecords = sum(Object.values(this.cachedModels).map((m) => m.flushableRecordCounter));
    return numOfRecords >= this.config.storeCacheThreshold;
  }

  resetMemoryStore(): void {
    Object.values(this.cachedModels).map((model) => model.clear());
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    await this.flushCache(true);
  }
}
