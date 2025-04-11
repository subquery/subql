// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BeforeApplicationShutdown} from '@nestjs/common';
import {ModelStatic} from '@subql/x-sequelize';
import {getLogger} from '../../logger';
import {MetadataRepo, PoiRepo} from '../entities';
import {HistoricalMode} from '../types';
import {Exporter} from './exporters';
import {METADATA_ENTITY_NAME} from './metadata/utils';
import {BaseEntity, IModel} from './model';
import {POI_ENTITY_NAME} from './poi';

const logger = getLogger('BaseStoreModelService');
export abstract class BaseStoreModelService<M = IModel<any>> implements BeforeApplicationShutdown {
  protected historical: HistoricalMode = 'height';
  protected poiRepo?: PoiRepo;
  protected metadataRepo?: MetadataRepo;
  protected cachedModels: Record<string, M> = {};

  protected abstract createModel(entity: string): M;

  init(historical: HistoricalMode, meta: MetadataRepo, poi?: PoiRepo): void {
    this.historical = historical;
    this.metadataRepo = meta;
    this.poiRepo = poi;
  }

  getModel<T extends BaseEntity>(entity: string): IModel<T> {
    if (entity === METADATA_ENTITY_NAME) {
      throw new Error('Please use getMetadataModel instead');
    }
    if (entity === POI_ENTITY_NAME) {
      throw new Error('Please use getPoiModel instead');
    }
    if (!this.cachedModels[entity]) {
      this.cachedModels[entity] = this.createModel(entity);
    }
    return this.cachedModels[entity] as IModel<T>;
  }

  updateModels({modifiedModels, removedModels}: {modifiedModels: ModelStatic<any>[]; removedModels: string[]}): void {
    modifiedModels.forEach((m) => {
      this.cachedModels[m.name] = this.createModel(m.name);
    });
    removedModels.forEach((r) => delete this.cachedModels[r]);
  }

  async beforeApplicationShutdown(): Promise<void> {
    await Promise.all(this.getAllExporters().map((e) => e.shutdown()));
    logger.info(`Force flush exports successful!`);
  }

  getAllExporters(): Exporter[] {
    return Object.values(this.cachedModels)
      .map((m) => (m as any).exporters ?? [])
      .flat();
  }
}
