// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {BaseDataSource} from '@subql/common';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../configure';
import {CacheMetadataModel, ISubqueryProject, IUnfinalizedBlocksService, MmrService, StoreService} from '../indexer';
import {DynamicDsService} from '../indexer/dynamic-ds.service';
import {getLogger} from '../logger';
import {getExistingProjectSchema, initDbSchema, reindex} from '../utils';
import {ForceCleanService} from './forceClean.service';

const logger = getLogger('Reindex');

export abstract class BaseReindexService<P extends ISubqueryProject, DS extends BaseDataSource, B> {
  private _metadataRepo?: CacheMetadataModel;

  protected abstract getStartBlockDatasources(): Promise<DS[]>;

  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    private readonly mmrService: MmrService,
    protected readonly project: P,
    private readonly forceCleanService: ForceCleanService,
    private readonly unfinalizedBlocksService: IUnfinalizedBlocksService<B>,
    private readonly dynamicDsService: DynamicDsService<DS>
  ) {}

  private get metadataRepo(): CacheMetadataModel {
    assert(this._metadataRepo, 'BaseReindexService has not been init');
    return this._metadataRepo;
  }

  async init(): Promise<void> {
    const schema = await this.getExistingProjectSchema();

    if (!schema) {
      logger.error('Unable to locate schema');
      throw new Error('Schema does not exist.');
    }
    await initDbSchema(this.project, schema, this.storeService);

    this._metadataRepo = this.storeService.storeCache.metadata;

    this.dynamicDsService.init(this.metadataRepo);
  }

  async getTargetHeightWithUnfinalizedBlocks(inputHeight: number): Promise<number> {
    const unfinalizedBlocks = await this.unfinalizedBlocksService.getMetadataUnfinalizedBlocks();
    const bestBlocks = unfinalizedBlocks.filter(({blockHeight}) => blockHeight <= inputHeight);
    if (bestBlocks.length === 0) {
      return inputHeight;
    }
    const {blockHeight: firstBestBlock} = bestBlocks[0];
    return Math.min(inputHeight, firstBestBlock);
  }

  private async getExistingProjectSchema(): Promise<string | undefined> {
    return getExistingProjectSchema(this.nodeConfig, this.sequelize);
  }

  private async getLastProcessedHeight(): Promise<number | undefined> {
    return this.metadataRepo.find('lastProcessedHeight');
  }

  private async getMetadataBlockOffset(): Promise<number | undefined> {
    return this.metadataRepo.find('blockOffset');
  }

  protected async getMetadataSpecName(): Promise<string | undefined> {
    return this.metadataRepo.find('specName');
  }

  private async getStartBlockFromDataSources() {
    const datasources = await this.getStartBlockDatasources();

    const startBlocksList = datasources.map((item) => item.startBlock ?? 1);
    if (startBlocksList.length === 0) {
      logger.error(`Failed to find a valid datasource, Please check your endpoint if specName filter is used.`);
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

    assert(lastProcessedHeight !== undefined, 'Cannot reindex without being able to get the lastProcessedHeight');

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
      this.forceCleanService
    );

    await this.storeService.storeCache.flushCache(true, true);
  }
}
