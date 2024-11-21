// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BeforeApplicationShutdown} from '@nestjs/common';
import {getLogger} from '@subql/node-core/logger';
import {ModelStatic} from '@subql/x-sequelize';
import {MetadataRepo, PoiRepo} from '../entities';
import {METADATA_ENTITY_NAME} from './metadata/utils';
import {BaseEntity, IModel} from './model';
import {POI_ENTITY_NAME} from './poi';
import {Exporter} from './types';

const logger = getLogger('BaseStoreModelService');
export abstract class BaseStoreModelService<M = IModel<any>> implements BeforeApplicationShutdown {
  protected historical = true;
  protected poiRepo?: PoiRepo;
  protected metadataRepo?: MetadataRepo;
  protected cachedModels: Record<string, M> = {};
  protected useCockroachDb?: boolean;
  protected exports: Exporter[] = [];

  protected abstract createModel(entity: string): M;

  init(historical: boolean, useCockroachDb: boolean, meta: MetadataRepo, poi?: PoiRepo): void {
    this.historical = historical;
    this.metadataRepo = meta;
    this.poiRepo = poi;
    this.useCockroachDb = useCockroachDb;
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
    await Promise.all(this.exports.map((f) => f.shutdown()));
    logger.info(`Force flush exports successful!`);
  }
}
