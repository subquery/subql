// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  getLogger,
  MmrService,
  NodeConfig,
  StoreService,
  getExistingProjectSchema,
  CacheMetadataModel,
} from '@subql/node-core';
import { Sequelize } from 'sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';
import { initDbSchema } from '../utils/project';
import { reindex } from '../utils/reindex';

import { ForceCleanService } from './forceClean.service';

const logger = getLogger('Reindex');

@Injectable()
export class ReindexService {
  private schema: string;
  private metadataRepo: CacheMetadataModel;

  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    private readonly mmrService: MmrService,
    @Inject('ISubqueryProject') private readonly project: SubqueryProject,
    private readonly forceCleanService: ForceCleanService,
    private readonly unfinalizedBlocksService: UnfinalizedBlocksService,
    private readonly dynamicDsService: DynamicDsService,
  ) {}

  async init(): Promise<void> {
    this.schema = await this.getExistingProjectSchema();

    if (!this.schema) {
      logger.error('Unable to locate schema');
      throw new Error('Schema does not exist.');
    }
    await this.initDbSchema();

    this.metadataRepo = this.storeService.storeCache.metadata;

    this.dynamicDsService.init(this.metadataRepo);
  }

  async getTargetHeightWithUnfinalizedBlocks(
    inputHeight: number,
  ): Promise<number> {
    // Why does this happen?
    (this.unfinalizedBlocksService as any).metadataRepo = this.metadataRepo;
    const unfinalizedBlocks =
      await this.unfinalizedBlocksService.getMetadataUnfinalizedBlocks();
    const bestBlocks = unfinalizedBlocks.filter(
      ([bestBlockHeight]) => Number(bestBlockHeight) <= inputHeight,
    );
    if (bestBlocks.length === 0) {
      return inputHeight;
    }
    const [firstBestBlock] = bestBlocks[0];
    return Math.min(inputHeight, firstBestBlock);
  }

  private async getExistingProjectSchema(): Promise<string> {
    return getExistingProjectSchema(this.nodeConfig, this.sequelize);
  }

  private async getLastProcessedHeight(): Promise<number | undefined> {
    return this.metadataRepo.find('lastProcessedHeight');
  }

  private async getMetadataBlockOffset(): Promise<number | undefined> {
    return this.metadataRepo.find('blockOffset');
  }

  private async getMetadataSpecName(): Promise<string | undefined> {
    return this.metadataRepo.find('specName');
  }

  private async initDbSchema(): Promise<void> {
    await initDbSchema(this.project, this.schema, this.storeService);
  }

  private getStartBlockFromDataSources(): number {
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
    const [startHeight, lastProcessedHeight] = await Promise.all([
      this.getStartBlockFromDataSources(),
      this.getLastProcessedHeight(),
    ]);

    await reindex(
      startHeight,
      await this.getMetadataBlockOffset(),
      targetBlockHeight,
      lastProcessedHeight,
      this.storeService,
      this.unfinalizedBlocksService,
      this.dynamicDsService,
      this.mmrService,
      this.sequelize,
      this.forceCleanService,
    );
    await this.storeService.storeCache.flushCache(true, true);
  }
}
