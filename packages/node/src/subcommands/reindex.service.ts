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
import { BestBlocks } from '../indexer/types';
import {
  METADATA_LAST_FINALIZED_PROCESSED_KEY,
  METADATA_UNFINALIZED_BLOCKS_KEY,
  UnfinalizedBlocksService,
} from '../indexer/unfinalizedBlocks.service';
import { initDbSchema } from '../utils/project';
import { reindex } from '../utils/reindex';

import { ForceCleanService } from './forceClean.service';

const logger = getLogger('Reindex');

@Injectable()
export class ReindexService {
  private schema: string;
  private metadataRepo: MetadataRepo;

  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    private readonly mmrService: MmrService,
    private readonly project: SubqueryProject,
    private readonly forceCleanService: ForceCleanService,
    private readonly unfinalizedBlocksService: UnfinalizedBlocksService,
  ) {}

  async init(): Promise<void> {
    this.schema = await this.getExistingProjectSchema();

    if (!this.schema) {
      logger.error('Unable to locate schema');
      throw new Error('Schema does not exist.');
    }
    await this.initDbSchema();

    this.metadataRepo = MetadataFactory(this.sequelize, this.schema);

    this.unfinalizedBlocksService.init(this.metadataRepo, () =>
      Promise.resolve(),
    );
  }

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

  private async getDataSourcesForSpecName(): Promise<SubqlProjectDs[]> {
    const specName = await this.getMetadataSpecName();
    return this.project.dataSources.filter(
      (ds) => !ds.filter?.specName || ds.filter.specName === specName,
    );
  }

  private async getStartBlockFromDataSources() {
    const datasources = await this.getDataSourcesForSpecName();

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
    const [startHeight, lastProcessedHeight] = await Promise.all([
      this.getStartBlockFromDataSources(),
      this.getLastProcessedHeight(),
    ]);

    return reindex(
      startHeight,
      await this.getMetadataBlockOffset(),
      targetBlockHeight,
      lastProcessedHeight,
      this.storeService,
      this.unfinalizedBlocksService,
      this.mmrService,
      this.sequelize,
      this.forceCleanService,
    );
  }
}
