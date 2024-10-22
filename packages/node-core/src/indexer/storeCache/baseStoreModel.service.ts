// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getLogger} from '@subql/node-core/logger';
import {ModelStatic} from '@subql/x-sequelize';
import {MetadataRepo, PoiRepo} from '../entities';
import {IMetadata} from './metadata';
import {METADATA_ENTITY_NAME} from './metadata/utils';
import {BaseEntity, IModel} from './model';
import {IPoi, POI_ENTITY_NAME} from './poi';
import {IStoreModelService} from './storeModel.service';

const logger = getLogger('BaseStoreModelService');
export abstract class BaseStoreModelService<M = IModel<any>> implements IStoreModelService {
  protected historical = true;
  protected poiRepo?: PoiRepo;
  protected metadataRepo?: MetadataRepo;
  protected cachedModels: Record<string, M> = {};
  protected useCockroachDb?: boolean;

  protected abstract createModel(entity: string): M;

  abstract poi: IPoi | null;
  abstract metadata: IMetadata;
  abstract applyPendingChanges(height: number, dataSourcesCompleted: boolean): Promise<void>;

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

  // eslint-disable-next-line @typescript-eslint/require-await
  async resetData() {
    logger.info('No need to resetData');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async flushData(forceFlush?: boolean) {
    logger.info('No need to flushData');
  }
}
