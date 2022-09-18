// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  getLogger,
  IndexerEvent,
  MetadataFactory,
  MetadataRepo,
  MmrService,
  NodeConfig,
  StoreService,
  SubqueryRepo,
} from '@subql/node-core';
import { Sequelize } from 'sequelize';
// import {SubqueryProject} from "../configure/SubqueryProject";
import { getExistingProjectSchema } from '../utils/project';

const logger = getLogger('Reindex');

@Injectable()
export class ReindexService {
  // private _schema: string;
  private metadataRepo: MetadataRepo;

  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    private readonly mmrService: MmrService,
    // private readonly project: SubqueryProject,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
  ) {}

  async getLastProcessedHeight(): Promise<number | undefined> {
    const res = await this.metadataRepo.findOne({
      where: { key: 'lastProcessedHeight' },
    });

    return res?.value as number | undefined;
  }

  async getMetadataBlockOffset(): Promise<number | undefined> {
    const res = await this.metadataRepo.findOne({
      where: { key: 'blockOffset' },
    });

    return res?.value as number | undefined;
  }

  async reindex(targetBlockHeight: number): Promise<void> {
    // check Schema exists

    const schema = await getExistingProjectSchema(
      this.nodeConfig,
      this.sequelize,
      this.subqueryRepo,
      logger,
    );
    if (!schema) {
      logger.error('Unable to locate schema');
      throw new Error('Schema does not exist.');
    }

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
      await this.storeService.rewind(this.nodeConfig.reindex, transaction);

      const blockOffset = await this.getMetadataBlockOffset();
      if (blockOffset) {
        await this.mmrService.deleteMmrNode(targetBlockHeight + 1, blockOffset);
      }
      await transaction.commit();
    } catch (err) {
      logger.error(err, 'Reindexing failed');
      await transaction.rollback();
      throw err;
    }
  }
}
