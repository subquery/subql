// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Sequelize, ModelStatic} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {getLogger} from '../../logger';
import {exitWithError} from '../../process';
import {MetadataRepo, PoiRepo} from '../entities';
import {StoreService} from '../store.service';
import {BaseStoreModelService} from './baseStoreModel.service';
import {CsvStoreService} from './csvStore.service';
import {IMetadata} from './metadata';
import {MetadataModel} from './metadata/metadata';
import {METADATA_ENTITY_NAME} from './metadata/utils';
import {BaseEntity, IModel} from './model';
import {PlainModel} from './model/model';
import {IPoi, PlainPoiModel, POI_ENTITY_NAME} from './poi';

export interface IStoreModelService {
  poi: IPoi | null;
  metadata: IMetadata;

  init(historical: boolean, useCockroachDb: boolean, meta: MetadataRepo, poi?: PoiRepo): void;

  getModel<T extends BaseEntity>(entity: string): IModel<T>;

  // addExporter(entity: string, exporterStore: CsvStoreService): void;

  applyPendingChanges(height: number, dataSourcesCompleted: boolean): Promise<void>;

  updateModels({modifiedModels, removedModels}: {modifiedModels: ModelStatic<any>[]; removedModels: string[]}): void;

  resetData?(): Promise<void>;

  flushData?(forceFlush?: boolean): Promise<void>;
}

const logger = getLogger('PlainStoreModelService');

export class PlainStoreModelService extends BaseStoreModelService implements IStoreModelService {
  constructor(
    private sequelize: Sequelize,
    private config: NodeConfig,
    private storeService: StoreService
  ) {
    super();
  }

  get metadata(): MetadataModel {
    if (!this.cachedModels[METADATA_ENTITY_NAME]) {
      if (!this.metadataRepo) {
        throw new Error('Metadata entity has not been set');
      }
      this.cachedModels[METADATA_ENTITY_NAME] = new MetadataModel(this.metadataRepo) as any;
    }

    return this.cachedModels[METADATA_ENTITY_NAME] as unknown as MetadataModel;
  }

  get poi(): PlainPoiModel | null {
    if (!this.cachedModels[POI_ENTITY_NAME]) {
      if (!this.poiRepo) {
        return null;
        // throw new Error('Poi entity has not been set on store cache');
      }
      this.cachedModels[POI_ENTITY_NAME] = new PlainPoiModel(this.poiRepo) as any;
    }

    return this.cachedModels[POI_ENTITY_NAME] as unknown as PlainPoiModel;
  }

  protected createModel(entityName: string): IModel<any> {
    const model = this.sequelize.model(entityName);

    const plainModel = new PlainModel(model, this.historical);

    if (this.config.csvOutDir) {
      const exporterStore = new CsvStoreService(entityName, this.config.csvOutDir);
      this.addExporter(plainModel, exporterStore);
    }

    return plainModel;
  }

  private addExporter(model: PlainModel, exporterStore: CsvStoreService): void {
    throw new Error('Not implemented');
  }

  async applyPendingChanges(height: number, dataSourcesCompleted: boolean): Promise<void> {
    const tx = this.storeService.transaction;
    if (!tx) {
      exitWithError(new Error('Transaction not found'), logger, 1);
    }
    await tx.commit();

    if (dataSourcesCompleted) {
      const msg = `All data sources have been processed up to block number ${height}. Exiting gracefully...`;
      exitWithError(msg, logger, 0);
    }
  }
}
