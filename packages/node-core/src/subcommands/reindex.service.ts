// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Inject, Injectable} from '@nestjs/common';
import {BaseDataSource} from '@subql/types-core';
import {Sequelize} from '@subql/x-sequelize';
import {IBlockchainService} from '../blockchain.service';
import {NodeConfig, ProjectUpgradeService} from '../configure';
import {
  IUnfinalizedBlocksService,
  StoreService,
  ISubqueryProject,
  PoiService,
  IMetadata,
  cacheProviderFlushData,
  Header,
  MultiChainRewindService,
} from '../indexer';
import {DynamicDsService} from '../indexer/dynamic-ds.service';
import {getLogger} from '../logger';
import {exitWithError, monitorWrite} from '../process';
import {getExistingProjectSchema, reindex} from '../utils';
import {ForceCleanService} from './forceClean.service';

const logger = getLogger('Reindex');

@Injectable()
export class ReindexService<P extends ISubqueryProject, DS extends BaseDataSource, B> {
  private _metadataRepo?: IMetadata;
  private _lastProcessedHeader?: {height: number; timestamp?: number};

  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    private readonly poiService: PoiService,
    @Inject('IProjectUpgradeService') private readonly projectUpgradeService: ProjectUpgradeService,
    @Inject('ISubqueryProject') private readonly project: P,
    private readonly forceCleanService: ForceCleanService,
    @Inject('UnfinalizedBlocksService') private readonly unfinalizedBlocksService: IUnfinalizedBlocksService<B>,
    @Inject('DynamicDsService') private readonly dynamicDsService: DynamicDsService<DS>,
    @Inject('IBlockchainService') private readonly blockchainService: IBlockchainService<DS>,
    private readonly multiChainRewindService: MultiChainRewindService
  ) {}

  private get metadataRepo(): IMetadata {
    assert(this._metadataRepo, 'BaseReindexService has not been init');
    return this._metadataRepo;
  }

  async init(): Promise<void> {
    const schema = await this.getExistingProjectSchema();

    if (!schema) {
      logger.error('Unable to locate schema');
      throw new Error('Schema does not exist.');
    }

    await this.storeService.initCoreTables(schema);
    if (this.nodeConfig.proofOfIndex) {
      await this.poiService.init(schema);
    }
    const tx = await this.sequelize.transaction();
    await this.storeService.init(schema, tx);
    await tx.commit();

    this._metadataRepo = this.storeService.modelProvider.metadata;

    await this.dynamicDsService.init(this.metadataRepo);

    const {height, timestamp} = await this.storeService.getLastProcessedBlock();

    if (height === undefined) {
      throw new Error('lastProcessedHeight is not defined');
    }

    this._lastProcessedHeader = {
      height,
      timestamp,
    };

    const chain = await this.storeService.modelProvider.metadata.find('chain');
    assert(chain, 'Chain not found in metadata');

    await this.multiChainRewindService.init(chain);

    await this.projectUpgradeService.init(
      this.storeService,
      this.lastProcessedHeader.height,
      this.nodeConfig,
      this.sequelize,
      schema
    );
  }

  async getTargetHeightWithUnfinalizedBlocks(inputHeight: number): Promise<Header> {
    const inputHeader = await this.blockchainService.getHeaderForHeight(inputHeight);

    const unfinalizedBlocks = await this.unfinalizedBlocksService.getMetadataUnfinalizedBlocks();
    const bestBlocks = unfinalizedBlocks.filter(({blockHeight}) => blockHeight <= inputHeight);
    if (bestBlocks.length && inputHeight >= bestBlocks[0].blockHeight) {
      return bestBlocks[0];
    }
    return inputHeader;
  }

  private async getExistingProjectSchema(): Promise<string | undefined> {
    return getExistingProjectSchema(this.nodeConfig, this.sequelize);
  }

  get lastProcessedHeader(): {height: number; timestamp?: number} {
    assert(this._lastProcessedHeader !== undefined, 'Cannot reindex without lastProcessedHeight been initialized');
    return this._lastProcessedHeader;
  }

  private getStartBlockFromDataSources(): number {
    const datasources = this.project.dataSources;

    const startBlocksList = datasources.map((item) => item.startBlock ?? 1);
    if (startBlocksList.length === 0) {
      exitWithError(
        `Failed to find a valid datasource, Please check your endpoint if specName filter is used.`,
        logger
      );
    } else {
      return Math.min(...startBlocksList);
    }
  }

  async reindex(targetBlockHeader: Header): Promise<void> {
    const startHeight = this.getStartBlockFromDataSources();
    monitorWrite(
      `- Reindex when last processed is ${this.lastProcessedHeader.height}, to block ${targetBlockHeader.blockHeight}`
    );

    await reindex(
      startHeight,
      targetBlockHeader,
      this.lastProcessedHeader,
      this.storeService,
      this.unfinalizedBlocksService,
      this.dynamicDsService,
      this.sequelize,
      this.projectUpgradeService,
      this.multiChainRewindService,
      this.nodeConfig.proofOfIndex ? this.poiService : undefined,
      this.forceCleanService
    );

    await cacheProviderFlushData(this.storeService.modelProvider, true);
    monitorWrite(`- Reindex completed`);
  }
}
