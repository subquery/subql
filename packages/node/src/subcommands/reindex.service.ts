// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  getLogger,
  MetadataFactory,
  MetadataRepo,
  MmrService,
  NodeConfig,
  StoreService,
  SubqueryRepo,
} from '@subql/node-core';
import { Sequelize } from 'sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import {
  getExistingProjectSchema,
  getMetaDataInfo,
  initDbSchemaUtil,
} from '../utils/project';

const logger = getLogger('Reindex');

@Injectable()
export class ReindexService {
  private _schema: string;
  private metadataRepo: MetadataRepo;

  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    private readonly mmrService: MmrService,
    private readonly project: SubqueryProject,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
  ) {}

  private async getExistingProjectSchema(): Promise<string> {
    return getExistingProjectSchema(
      this.nodeConfig,
      this.sequelize,
      this.subqueryRepo,
    );
  }

  get schema(): string {
    return this._schema;
  }

  private async getLastProcessedHeight(): Promise<number | undefined> {
    return getMetaDataInfo(this.metadataRepo, 'lastProcessedHeight');
  }

  private async getMetadataBlockOffset(): Promise<number | undefined> {
    return getMetaDataInfo(this.metadataRepo, 'blockOffset');
  }

  private async initDbSchema(): Promise<void> {
    await initDbSchemaUtil(this.project, this.schema, this.storeService);
  }

  async reindex(targetBlockHeight: number): Promise<void> {
    this._schema = await this.getExistingProjectSchema();

    if (!this.schema) {
      logger.error('Unable to locate schema');
      throw new Error('Schema does not exist.');
    }

    await this.initDbSchema();

    // check Schema exists
    this.metadataRepo = MetadataFactory(this.sequelize, this.schema);

    const lastProcessedHeight = await this.getLastProcessedHeight();

    if (!this.storeService.historical) {
      logger.warn('Unable to reindex, historical state not enabled');
      return;
    }
    if (!lastProcessedHeight || lastProcessedHeight < targetBlockHeight) {
      logger.warn(
        `Skipping reindexing to block ${targetBlockHeight}: current indexing height ${lastProcessedHeight} is behind requested block`,
      );
      return;
    }
    logger.info(`Reindexing to block: ${targetBlockHeight}`);
    const transaction = await this.sequelize.transaction();
    try {
      await this.storeService.rewind(targetBlockHeight, transaction);

      const blockOffset = await this.getMetadataBlockOffset();
      if (blockOffset) {
        await this.mmrService.deleteMmrNode(targetBlockHeight + 1, blockOffset);
      }
      await transaction.commit();
      logger.info('Reindex Success');
    } catch (err) {
      logger.error(err, 'Reindexing failed');
      await transaction.rollback();
      throw err;
    }
  }
}
