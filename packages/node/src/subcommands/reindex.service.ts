// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import {
  getLogger,
  MetadataFactory,
  MetadataRepo,
  MmrService,
  NodeConfig,
  StoreService,
  getExistingProjectSchema,
  getMetaDataInfo,
} from '@subql/node-core';
import { Sequelize } from 'sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { initDbSchema } from '../utils/project';

import { ForceCleanService } from './forceClean.service';

const logger = getLogger('Reindex');

@Injectable()
export class ReindexService {
  private schema: string;
  private metadataRepo: MetadataRepo;
  private specName: string;
  private startHeight: number;
  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    private readonly mmrService: MmrService,
    private readonly project: SubqueryProject,
    private readonly forceCleanService: ForceCleanService,
  ) {}

  private async getExistingProjectSchema(): Promise<string> {
    return getExistingProjectSchema(this.nodeConfig, this.sequelize);
  }

  private async getLastProcessedHeight(): Promise<number | undefined> {
    return getMetaDataInfo(this.metadataRepo, 'lastProcessedHeight');
  }

  private async getMetadataBlockOffset(): Promise<number | undefined> {
    return getMetaDataInfo(this.metadataRepo, 'blockOffset');
  }

  private async getMetadataSpecName(): Promise<string | undefined> {
    const res = await this.metadataRepo.findOne({
      where: { key: 'specName' },
    });
    return res?.value as string | undefined;
  }

  private async initDbSchema(): Promise<void> {
    await initDbSchema(this.project, this.schema, this.storeService);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getStartBlockFromDataSources() {
    const datasources = this.project.dataSources;

    const startBlocksList = datasources.map((item) => item.startBlock ?? 1);
    if (startBlocksList.length === 0) {
      logger.error(
        `Failed to find a valid datasource, Please check your endpoint if specName filter is used.`,
      );
      process.exit(1);
    } else {
      return Math.min(...startBlocksList);
    }
  }

  async reindex(targetBlockHeight: number): Promise<void> {
    this.schema = await this.getExistingProjectSchema();

    if (!this.schema) {
      logger.error('Unable to locate schema');
      throw new Error('Schema does not exist.');
    }
    await this.initDbSchema();

    this.metadataRepo = MetadataFactory(this.sequelize, this.schema);

    this.startHeight = await this.getStartBlockFromDataSources();

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

    // if startHeight is greater than the targetHeight, just force clean
    if (targetBlockHeight < this.startHeight) {
      logger.info(
        `targetHeight: ${targetBlockHeight} is less than startHeight: ${this.startHeight}. Hence executing force-clean`,
      );
      await this.forceCleanService.forceClean();
    } else {
      logger.info(`Reindexing to block: ${targetBlockHeight}`);
      const transaction = await this.sequelize.transaction();
      try {
        await this.storeService.rewind(targetBlockHeight, transaction);

        const blockOffset = await this.getMetadataBlockOffset();
        if (blockOffset) {
          await this.mmrService.deleteMmrNode(
            targetBlockHeight + 1,
            blockOffset,
          );
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
}
