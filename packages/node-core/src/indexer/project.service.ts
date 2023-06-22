// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {isMainThread} from 'worker_threads';
import {Inject} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Sequelize} from '@subql/x-sequelize';
import {IApi} from '../api.service';
import {NodeConfig} from '../configure';
import {IndexerEvent} from '../events';
import {getLogger} from '../logger';
import {getExistingProjectSchema, initDbSchema, initHotSchemaReload, reindex} from '../utils';
import {BaseDsProcessorService} from './ds-processor.service';
import {DynamicDsService} from './dynamic-ds.service';
import {MetadataKeys} from './entities';
import {MmrService} from './mmr.service';
import {PoiService} from './poi/poi.service';
import {StoreService} from './store.service';
import {CacheMetadataModel} from './storeCache';
import {IProjectNetworkConfig, IProjectService, ISubqueryProject} from './types';
import {IUnfinalizedBlocksService} from './unfinalizedBlocks.service';

const logger = getLogger('Project');

class NotInitError extends Error {
  constructor() {
    super('ProjectService has not been initialized');
  }
}

export abstract class BaseProjectService<API extends IApi, DS extends {startBlock?: number}>
  implements IProjectService<DS>
{
  private _schema?: string;
  private _startHeight?: number;
  private _blockOffset?: number;

  protected abstract packageVersion: string;
  protected abstract generateTimestampReferenceForBlockFilters(dataSources: DS[]): Promise<DS[]>;

  // Used in the substrate SDK to do extra filtering for spec version
  protected abstract getStartBlockDatasources(): DS[];

  constructor(
    private readonly dsProcessorService: BaseDsProcessorService,
    protected readonly apiService: API,
    private readonly poiService: PoiService,
    protected readonly mmrService: MmrService,
    protected readonly sequelize: Sequelize,
    @Inject('ISubqueryProject') protected readonly project: ISubqueryProject<IProjectNetworkConfig, DS>,
    protected readonly storeService: StoreService,
    protected readonly nodeConfig: NodeConfig,
    protected readonly dynamicDsService: DynamicDsService<DS>,
    private eventEmitter: EventEmitter2,
    private unfinalizedBlockService: IUnfinalizedBlocksService<any>
  ) {}

  protected get schema(): string {
    assert(this._schema, new NotInitError());
    return this._schema;
  }

  get startHeight(): number {
    assert(this._startHeight !== undefined, new NotInitError());
    return this._startHeight;
  }

  get blockOffset(): number | undefined {
    return this._blockOffset;
  }

  protected get isHistorical(): boolean {
    return this.storeService.historical;
  }

  private async getExistingProjectSchema(): Promise<string | undefined> {
    return getExistingProjectSchema(this.nodeConfig, this.sequelize);
  }

  async init(): Promise<void> {
    // Used to load assets into DS-processor, has to be done in any thread
    await this.dsProcessorService.validateProjectCustomDatasources();
    // Do extra work on main thread to setup stuff
    this.project.dataSources = await this.generateTimestampReferenceForBlockFilters(this.project.dataSources);
    if (isMainThread) {
      this._schema = await this.ensureProject();
      await this.initDbSchema();
      await this.ensureMetadata();
      this.dynamicDsService.init(this.storeService.storeCache.metadata);

      await this.initHotSchemaReload();

      this._startHeight = await this.getStartHeight();

      const reindexedTo = await this.initUnfinalized();

      if (reindexedTo !== undefined) {
        this._startHeight = reindexedTo;
      }
      // Flush any pending operations to set up DB
      await this.storeService.storeCache.flushCache(true);

      if (this.nodeConfig.proofOfIndex) {
        const blockOffset = await this.getMetadataBlockOffset();
        await this.poiService.init();
        // Flush cache to setup rest of POI related meta
        await this.storeService.storeCache.flushCache(true);
        // syncFileBaseFromPoi at the bottom, avoid DB be blocked lead project init not completed,
        // And fetch service have to keep waiting
        void this.setBlockOffset(Number(blockOffset));
      }
    } else {
      this._schema = await this.getExistingProjectSchema();

      await this.sequelize.sync();

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
    const schema = this.nodeConfig.dbSchema;
    const schemas = await this.sequelize.showAllSchemas({});
    if (!(schemas as unknown as string[]).includes(schema)) {
      await this.sequelize.createSchema(`"${schema}"`, {});
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

    this.eventEmitter.emit(IndexerEvent.NetworkMetadata, this.apiService.networkMeta);

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
      'deployments',
    ] as const;

    const existing = await metadata.findMany(keys);

    const {chain, genesisHash, specName} = this.apiService.networkMeta;

    if (this.project.runner) {
      const {node, query} = this.project.runner;

      metadata.setBulk([
        {key: 'runnerNode', value: node.name},
        {key: 'runnerNodeVersion', value: node.version},
        {key: 'runnerQuery', value: query.name},
        {key: 'runnerQueryVersion', value: query.version},
      ]);
    }
    if (!existing.genesisHash) {
      metadata.set('genesisHash', genesisHash);
    } else {
      // Check if the configured genesisHash matches the currently stored genesisHash
      assert(
        genesisHash === existing.genesisHash,
        `Specified project manifest chain id / genesis hash does not match database stored genesis hash, consider cleaning project schema using "force-clean".\n Database genesis hash = "${existing.genesisHash}"\n Network genesis hash = "${genesisHash}"`
      );
    }
    if (existing.chain !== chain) {
      metadata.set('chain', chain);
    }

    if (existing.specName !== specName) {
      metadata.set('specName', specName);
    }

    // If project was created before this feature, don't add the key. If it is project created after, add this key.
    if (!existing.processedBlockCount && !existing.lastProcessedHeight) {
      metadata.set('processedBlockCount', 0);
    }

    if (existing.indexerNodeVersion !== this.packageVersion) {
      metadata.set('indexerNodeVersion', this.packageVersion);
    }
    if (!existing.schemaMigrationCount) {
      metadata.set('schemaMigrationCount', 0);
    }
    if (!existing.startHeight) {
      metadata.set('startHeight', this.getStartBlockFromDataSources());
    }

    await this.syncDeployments(existing, metadata);
  }

  protected async getMetadataBlockOffset(): Promise<number | undefined> {
    return this.storeService.storeCache.metadata.find('blockOffset');
  }

  protected async getLastProcessedHeight(): Promise<number | undefined> {
    return this.storeService.storeCache.metadata.find('lastProcessedHeight');
  }

  private async syncDeployments(existing: Partial<MetadataKeys>, metadata: CacheMetadataModel): Promise<void> {
    if (!existing.deployments) {
      const deployments: Record<number, string> = {};
      //If metadata never record deployment, we are safe to use start height
      deployments[existing.startHeight ?? this.getStartBlockFromDataSources()] = this.project.id;
      metadata.set('deployments', JSON.stringify(deployments));
    } else {
      const deployments = JSON.parse(existing.deployments) as Record<number, string>;
      const values = Object.values(deployments);
      const lastDeployment = values[values.length - 1];
      // avoid 0
      if (lastDeployment !== this.project.id) {
        const newDeploymentStart = await this.getLastProcessedHeight();
        if (newDeploymentStart === undefined) {
          throw new Error(`Try to record new deployment failed, unable to find last processed height from metadata`);
        }
        logger.warn(`Project deployment upgrade found, start height: ${newDeploymentStart}, ID: ${this.project.id}`);
        deployments[newDeploymentStart] = this.project.id;
        metadata.set('deployments', JSON.stringify(deployments));
      }
      // if we found this deployment, all good.
    }
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
    if (this._blockOffset !== undefined || offset === null || offset === undefined || isNaN(offset)) {
      return;
    }
    logger.info(`set blockOffset to ${offset}`);
    this._blockOffset = offset;
    return this.mmrService.syncFileBaseFromPoi(offset, undefined, true).catch((err) => {
      logger.error(err, 'failed to sync poi to mmr');
      process.exit(1);
    });
  }

  protected getStartBlockFromDataSources(): number {
    // Ensure minimum start height should be 1
    const startBlocksList = this.getStartBlockDatasources().map((item) => item.startBlock || 1);
    if (startBlocksList.length === 0) {
      logger.error(`Failed to find a valid datasource, Please check your endpoint if specName filter is used.`);
      process.exit(1);
    } else {
      return Math.min(...startBlocksList);
    }
  }

  async getAllDataSources(blockHeight: number): Promise<DS[]> {
    const dynamicDs = await this.dynamicDsService.getDynamicDatasources();

    return [...this.project.dataSources, ...dynamicDs].filter(
      (ds) => ds.startBlock !== undefined && ds.startBlock <= blockHeight
    );
  }

  private async initUnfinalized(): Promise<number | undefined> {
    if (this.nodeConfig.unfinalizedBlocks && !this.isHistorical) {
      logger.error(
        'Unfinalized blocks cannot be enabled without historical. You will need to reindex your project to enable historical'
      );
      process.exit(1);
    }

    return this.unfinalizedBlockService.init(this.reindex.bind(this));
  }

  async reindex(targetBlockHeight: number): Promise<void> {
    const lastProcessedHeight = await this.getLastProcessedHeight();

    if (lastProcessedHeight === undefined) {
      throw new Error('Cannot reindex with missing lastProcessedHeight');
    }

    return reindex(
      this.getStartBlockFromDataSources(),
      await this.getMetadataBlockOffset(),
      targetBlockHeight,
      lastProcessedHeight,
      this.storeService,
      this.unfinalizedBlockService,
      this.dynamicDsService,
      this.mmrService,
      this.sequelize
      /* Not providing force clean service, it should never be needed */
    );
  }
}
