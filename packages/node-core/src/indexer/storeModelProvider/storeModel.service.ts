// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {Sequelize, Transaction} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {getLogger} from '../../logger';
import {exitWithError} from '../../process';
import {BaseStoreModelService} from './baseStoreModel.service';
import {CsvExporter, Exporter, isTxExporter} from './exporters';
import {MetadataModel} from './metadata/metadata';
import {METADATA_ENTITY_NAME} from './metadata/utils';
import {IModel} from './model';
import {PlainModel} from './model/model';
import {PlainPoiModel, POI_ENTITY_NAME} from './poi';
import {IStoreModelProvider} from './types';

const logger = getLogger('PlainStoreModelService');

@Injectable()
export class PlainStoreModelService extends BaseStoreModelService<IModel<any>> implements IStoreModelProvider {
  constructor(
    private sequelize: Sequelize,
    private config: NodeConfig
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
      const exporterStore = new CsvExporter(entityName, this.config.csvOutDir);
      this.addExporter(plainModel, exporterStore);
    }

    return plainModel;
  }

  private addExporter(model: PlainModel, exporter: Exporter): void {
    model.addExporter(exporter);
  }

  async applyPendingChanges(height: number, dataSourcesCompleted: boolean, tx: Transaction): Promise<void> {
    try {
      if (!tx) {
        exitWithError(new Error('Transaction not found'), logger, 1);
      }

      // Commit all data from exporters here to make exporting and commiting atomic
      await Promise.all(
        this.getAllExporters().map((exporter) => (isTxExporter(exporter) ? exporter.commit() : Promise.resolve()))
      );

      await tx.commit();

      if (dataSourcesCompleted) {
        const msg = `All data sources have been processed up to block number ${height}. Exiting gracefully...`;
        exitWithError(msg, logger, 0);
      }
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
}
