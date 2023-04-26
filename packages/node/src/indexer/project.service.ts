// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { isMainThread } from 'worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IProjectService,
  NodeConfig,
  IndexerEvent,
  StoreService,
  PoiService,
  MmrService,
  getLogger,
  getExistingProjectSchema,
} from '@subql/node-core';
import { Sequelize } from 'sequelize';
import {
  SubqueryProject,
  generateTimestampReferenceForBlockFilters,
  SubqlProjectDs,
} from '../configure/SubqueryProject';
import { initDbSchema, initHotSchemaReload } from '../utils/project';
import { reindex } from '../utils/reindex';
import { ApiService } from './api.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';

const logger = getLogger('Project');

@Injectable()
export class ProjectService implements IProjectService<SubqlProjectDs> {
  private _schema: string;
  private _startHeight: number;
  private _blockOffset: number;

  constructor(
    private readonly dsProcessorService: DsProcessorService,
    private readonly apiService: ApiService,
    private readonly poiService: PoiService,
    protected readonly mmrService: MmrService,
    private readonly sequelize: Sequelize,
    @Inject('ISubqueryProject') private readonly project: SubqueryProject,
    private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    private readonly dynamicDsService: DynamicDsService,
    private eventEmitter: EventEmitter2,
  ) {}

  get schema(): string {
    return this._schema;
  }

  get blockOffset(): number {
    return this._blockOffset;
  }

  get startHeight(): number {
    return this._startHeight;
  }

  get isHistorical(): boolean {
    return this.storeService.historical;
  }

  private async getExistingProjectSchema(): Promise<string> {
    return getExistingProjectSchema(this.nodeConfig, this.sequelize);
  }

  async init(): Promise<void> {
    // Used to load assets into DS-processor, has to be done in any thread
    await this.dsProcessorService.validateProjectCustomDatasources();
    // Do extra work on main thread to set up stuff
    this.project.dataSources = await generateTimestampReferenceForBlockFilters(
      this.project.dataSources,
      this.apiService.api,
    );
    if (isMainThread) {
      this._schema = await this.ensureProject();
      await this.initDbSchema();
      await this.ensureMetadata();
      this.dynamicDsService.init(this.storeService.storeCache.metadata);

      await this.initHotSchemaReload();

      if (this.nodeConfig.proofOfIndex) {
        const blockOffset = await this.getMetadataBlockOffset();
        void this.setBlockOffset(Number(blockOffset));
        await this.poiService.init();
      }

      this._startHeight = await this.getStartHeight();

      // Flush any pending operations to setup DB
      await this.storeService.storeCache.flushCache(true);
    } else {
      this._schema = await this.getExistingProjectSchema();

      await this.sequelize.sync();

      this._schema = await this.getExistingProjectSchema();
      assert(this._schema, 'Schema should be created in main thread');
      await this.initDbSchema();

      if (this.nodeConfig.proofOfIndex) {
        await this.poiService.init();
      }
    }
  }

  private async ensureProject(): Promise<string> {
    let schema = await this.getExistingProjectSchema();
    if (!schema) {
      schema = await this.createProjectSchema();
    }
    this.eventEmitter.emit(IndexerEvent.Ready, {
      value: true,
    });

    return schema;
  }

  private async createProjectSchema(): Promise<string> {
    let schema: string;
    if (this.nodeConfig.localMode) {
      // create tables in default schema if local mode is enabled
      schema = DEFAULT_DB_SCHEMA;
    } else {
      schema = this.nodeConfig.dbSchema;
      const schemas = await this.sequelize.showAllSchemas(undefined);
      if (!(schemas as unknown as string[]).includes(schema)) {
        await this.sequelize.createSchema(`"${schema}"`, undefined);
      }
    }

    return schema;
  }

  private async initHotSchemaReload(): Promise<void> {
    await initHotSchemaReload(this.schema, this.storeService);
  }
  private async initDbSchema(): Promise<void> {
    await initDbSchema(this.project, this.schema, this.storeService);
  }

  private async ensureMetadata(): Promise<void> {
    const metadata = this.storeService.storeCache.metadata;

    this.eventEmitter.emit(
      IndexerEvent.NetworkMetadata,
      this.apiService.networkMeta,
    );

    const keys = [
      'lastProcessedHeight',
      'blockOffset',
      'indexerNodeVersion',
      'chain',
      'specName',
      'genesisHash',
      'startHeight',
      'processedBlockCount',
      'lastFinalizedVerifiedHeight',
      'schemaMigrationCount',
    ] as const;

    const existing = await metadata.findMany(keys);

    const { chain } = this.apiService.networkMeta;

    if (this.project.runner) {
      const { node, query } = this.project.runner;

      metadata.setBulk([
        { key: 'runnerNode', value: node.name },
        { key: 'runnerNodeVersion', value: node.version },
        { key: 'runnerQuery', value: query.name },
        { key: 'runnerQueryVersion', value: query.version },
      ]);
    }

    if (existing.chain !== chain) {
      metadata.set('chain', chain);
    }

    // If project was created before this feature, don't add the key. If it is project created after, add this key.
    if (!existing.processedBlockCount && !existing.lastProcessedHeight) {
      metadata.set('processedBlockCount', 0);
    }

    if (existing.indexerNodeVersion !== packageVersion) {
      metadata.set('indexerNodeVersion', packageVersion);
    }
    if (!existing.schemaMigrationCount) {
      metadata.set('schemaMigrationCount', 0);
    }

    if (!existing.startHeight) {
      metadata.set('startHeight', this.getStartBlockFromDataSources());
    }
  }

  private async getMetadataBlockOffset(): Promise<number | undefined> {
    return this.storeService.storeCache.metadata.find('blockOffset');
  }

  private async getLastProcessedHeight(): Promise<number | undefined> {
    return this.storeService.storeCache.metadata.find('lastProcessedHeight');
  }

  private async getStartHeight(): Promise<number> {
    let startHeight: number;
    const lastProcessedHeight = await this.getLastProcessedHeight();
    if (lastProcessedHeight !== null && lastProcessedHeight !== undefined) {
      startHeight = Number(lastProcessedHeight) + 1;
    } else {
      startHeight = this.getStartBlockFromDataSources();
    }
    return startHeight;
  }

  async setBlockOffset(offset: number): Promise<void> {
    if (
      this._blockOffset !== undefined ||
      offset === null ||
      offset === undefined ||
      isNaN(offset)
    ) {
      return;
    }
    logger.info(`set blockOffset to ${offset}`);
    this._blockOffset = offset;
    return this.mmrService.syncFileBaseFromPoi(offset).catch((err) => {
      logger.error(err, 'failed to sync poi to mmr');
      process.exit(1);
    });
  }

  private getStartBlockFromDataSources() {
    const startBlocksList = this.project.dataSources.map(
      (item) => item.startBlock ?? 1,
    );
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
    const lastProcessedHeight = await this.getLastProcessedHeight();

    return reindex(
      this.getStartBlockFromDataSources(),
      await this.getMetadataBlockOffset(),
      targetBlockHeight,
      lastProcessedHeight,
      this.storeService,
      this.dynamicDsService,
      this.mmrService,
      this.sequelize,
      /* Not providing force clean service, it should never be needed */
    );
  }

  async getAllDataSources(blockHeight: number): Promise<SubqlProjectDs[]> {
    const dynamicDs = await this.dynamicDsService.getDynamicDatasources();

    return [...this.project.dataSources, ...dynamicDs].filter(
      (ds) => ds.startBlock <= blockHeight,
    );
  }
}
