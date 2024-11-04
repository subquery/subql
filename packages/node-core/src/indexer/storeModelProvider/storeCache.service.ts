// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Injectable} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {DatabaseError, Deferrable, ModelStatic, Sequelize, Transaction} from '@subql/x-sequelize';
import {sum} from 'lodash';
import {NodeConfig} from '../../configure';
import {IndexerEvent} from '../../events';
import {getLogger} from '../../logger';
import {exitWithError} from '../../process';
import {profiler} from '../../profiler';
import {MetadataRepo, PoiRepo} from '../entities';
import {BaseCacheService} from './baseCache.service';
import {CsvStoreService} from './csvStore.service';
import {CacheMetadataModel} from './metadata';
import {METADATA_ENTITY_NAME} from './metadata/utils';
import {CachedModel} from './model';
import {CachePoiModel, POI_ENTITY_NAME} from './poi';
import {Exporter, ICachedModelControl, IStoreModelProvider, FlushPolicy} from './types';

const logger = getLogger('StoreCacheService');

@Injectable()
export class StoreCacheService extends BaseCacheService implements IStoreModelProvider {
  private readonly storeCacheThreshold: number;
  private readonly cacheUpperLimit: number;
  private _storeOperationIndex = 0;
  private _lastFlushedOperationIndex = 0;
  private exports: Exporter[] = [];

  constructor(
    private sequelize: Sequelize,
    private config: NodeConfig,
    protected eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry
  ) {
    super('StoreCache');
    this.storeCacheThreshold = config.storeCacheThreshold;
    this.cacheUpperLimit = config.storeCacheUpperLimit;

    if (this.storeCacheThreshold > this.cacheUpperLimit) {
      exitWithError('Store cache threshold must be less than the store cache upper limit', logger);
    }
  }

  init(historical: boolean, useCockroachDb: boolean, meta: MetadataRepo, poi?: PoiRepo): void {
    super.init(historical, useCockroachDb, meta, poi);

    if (this.config.storeFlushInterval > 0) {
      this.schedulerRegistry.addInterval(
        'storeFlushInterval',
        setInterval(() => {
          this.flushData(true).catch((e) => logger.warn(`storeFlushInterval failed ${e.message}`));
        }, this.config.storeFlushInterval * 1000)
      );
    }
  }

  async beforeApplicationShutdown(): Promise<void> {
    try {
      this.schedulerRegistry.deleteInterval('storeFlushInterval');
    } catch (e) {
      /* Do nothing, an interval might not have been created */
    }
    await super.beforeApplicationShutdown();
  }

  getNextStoreOperationIndex(): number {
    this._storeOperationIndex += 1;
    return this._storeOperationIndex;
  }

  protected createModel(entityName: string): CachedModel<any> {
    const model = this.sequelize.model(entityName);
    assert(model, `model ${entityName} not exists`);
    const cachedModel = new CachedModel(
      model,
      this.historical,
      this.config,
      this.getNextStoreOperationIndex.bind(this)
    );
    if (this.config.csvOutDir) {
      const exporterStore = new CsvStoreService(entityName, this.config.csvOutDir);
      this.addExporter(cachedModel, exporterStore);
    }

    return cachedModel;
  }

  private addExporter(cachedModel: CachedModel, exporterStore: CsvStoreService): void {
    cachedModel.addExporterStore(exporterStore);
    this.exports.push(exporterStore);
  }

  async flushExportStores(): Promise<void> {
    await Promise.all(this.exports.map((f) => f.shutdown()));
  }

  get metadata(): CacheMetadataModel {
    if (!this.cachedModels[METADATA_ENTITY_NAME]) {
      if (!this.metadataRepo) {
        throw new Error('Metadata entity has not been set on store cache');
      }
      this.cachedModels[METADATA_ENTITY_NAME] = new CacheMetadataModel(this.metadataRepo);
    }
    return this.cachedModels[METADATA_ENTITY_NAME] as unknown as CacheMetadataModel;
  }

  get poi(): CachePoiModel | null {
    if (!this.cachedModels[POI_ENTITY_NAME]) {
      if (!this.poiRepo) {
        return null;
        // throw new Error('Poi entity has not been set on store cache');
      }
      this.cachedModels[POI_ENTITY_NAME] = new CachePoiModel(this.poiRepo);
    }

    return this.cachedModels[POI_ENTITY_NAME] as unknown as CachePoiModel;
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
  async _flushCache(): Promise<void> {
    this.logger.debug('Flushing cache');
    // With historical disabled we defer the constraints check so that it doesn't matter what order entities are modified
    const tx = await this.sequelize.transaction({
      deferrable: this.historical || this.useCockroachDb ? undefined : Deferrable.SET_DEFERRED(),
    });
    try {
      // Get the block height of all data we want to flush up to
      const blockHeight = await this.metadata.find('lastProcessedHeight');
      // Get models that have data to flush
      const updatableModels = Object.values(this.cachedModels).filter((m) => m.isFlushable);
      if (this.useCockroachDb) {
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
  }

  _resetCache(): void {
    for (const model of Object.values(this.cachedModels)) {
      model.clear();
    }
  }

  async flushAndWaitForCapacity(forceFlush?: boolean): Promise<void> {
    const flushableRecords = this.flushableRecords;

    const pendingFlush = this.flushData(forceFlush);

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
    return numOfRecords >= this.storeCacheThreshold;
  }

  async applyPendingChanges(height: number, dataSourcesCompleted: boolean): Promise<void> {
    if (this.config.storeCacheAsync) {
      // Flush all completed block data and don't wait
      await this.flushAndWaitForCapacity(false)?.catch((e) => {
        exitWithError(new Error(`Flushing cache failed`, {cause: e}), logger);
      });
    } else {
      // Flush all data from cache and wait
      await this.flushData(false);
    }

    if (dataSourcesCompleted) {
      const msg = `All data sources have been processed up to block number ${height}. Exiting gracefully...`;
      await this.flushData(false);
      exitWithError(msg, logger, 0);
    }
  }
}
