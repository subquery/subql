// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Injectable} from '@nestjs/common';
import {Sequelize, Transaction} from 'sequelize';
import {NodeConfig} from '../../configure';
import {CachedModel} from './cacheModel';
import {ICachedModel, EntitySetData} from './types';

const FLUSH_FREQUENCY = 5;

@Injectable()
export class StoreCacheService {
  historical: boolean;
  private flushCounter: number;
  tx: Transaction;

  private cachedModels: Record<string, CachedModel> = {};

  constructor(private sequelize: Sequelize, private config: NodeConfig) {
    this.resetMemoryStore();
    this.flushCounter = 0;
    this.historical = true; // TODO, need handle when is not historical
  }

  counterIncrement(): void {
    this.flushCounter += 1;
  }

  getModel<T>(entity: string): ICachedModel<T> {
    if (!this.cachedModels[entity]) {
      const model = this.sequelize.model(entity);
      assert(model, `model ${entity} not exists`);

      this.cachedModels[entity] = new CachedModel(model);
    }

    return this.cachedModels[entity] as unknown as ICachedModel<T>;
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

  private async _flushCache(): Promise<void> {
    if (!this.historical) {
      return;
    }

    // Get models that have data to flush
    const updatableModels = Object.values(this.cachedModels).filter((m) => m.isFlushable);

    await Promise.all(updatableModels.map((model) => model.flush(this.tx)));
  }

  async flushCache(): Promise<void> {
    if (this.isFlushable()) {
      await this._flushCache();
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
