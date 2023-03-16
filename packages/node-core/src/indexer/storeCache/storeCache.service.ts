// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Injectable} from '@nestjs/common';
import {Sequelize, Transaction} from 'sequelize';
import {NodeConfig} from '../../configure';
import {MetadataRepo} from '../entities';
import {CacheMetadataModel} from './cacheMetadata';
import {CachedModel} from './cacheModel';
import {ICachedModel, EntitySetData, ICachedModelControl} from './types';

const FLUSH_FREQUENCY = 5;

@Injectable()
export class StoreCacheService {
  historical: boolean;
  private flushCounter: number;
  private cachedModels: Record<string, ICachedModelControl<any>> = {};
  private metadataRepo: MetadataRepo;

  constructor(private sequelize: Sequelize) {
    this.resetMemoryStore();
    this.flushCounter = 0;
    this.historical = true; // TODO, need handle when is not historical
  }

  setMetadataRepo(repo: MetadataRepo): void {
    this.metadataRepo = repo;
  }

  counterIncrement(): void {
    this.flushCounter += 1;
  }

  getModel<T>(entity: string): ICachedModel<T> {
    if (entity === '_metadata') {
      throw new Error('Please use getMetadataModel instead');
    }
    if (!this.cachedModels[entity]) {
      const model = this.sequelize.model(entity);
      assert(model, `model ${entity} not exists`);

      this.cachedModels[entity] = new CachedModel(model);
    }

    return this.cachedModels[entity] as unknown as ICachedModel<T>;
  }

  getMetadataModel(): CacheMetadataModel {
    const entity = '_metadata';
    if (!this.cachedModels[entity]) {
      if (!this.metadataRepo) {
        throw new Error('Metadata entity has not been set on store cache');
      }
      this.cachedModels[entity] = new CacheMetadataModel(this.metadataRepo);
    }

    return this.cachedModels[entity] as unknown as CacheMetadataModel;
  }

  dumpSetData(): EntitySetData {
    const res: EntitySetData = {};

    Object.entries(this.cachedModels).map(([entity, model]) => {
      if (model.isFlushable) {
        res[entity] = model.dumpSetData();
      }
    });

    return res;
  }

  private async _flushCache(tx: Transaction): Promise<void> {
    if (!this.historical) {
      return;
    }

    // Get models that have data to flush
    const updatableModels = Object.values(this.cachedModels).filter((m) => m.isFlushable);

    await Promise.all(updatableModels.map((model) => model.flush(tx)));
  }

  async flushCache(tx: Transaction): Promise<void> {
    if (this.isFlushable()) {
      await this._flushCache(tx);
      // Note flushCache and commit transaction need to sequential
      // await this.commitTransaction();
      this.resetMemoryStore();
    }
  }

  syncData(data: EntitySetData): void {
    Object.entries(data).map(([entity, setData]) => {
      (this.getModel(entity) as CachedModel).sync(setData);
    });
  }

  isFlushable(): boolean {
    return this.flushCounter % FLUSH_FREQUENCY === 0;
  }

  resetMemoryStore(): void {
    Object.values(this.cachedModels).map((model) => model.clear());
  }
}
