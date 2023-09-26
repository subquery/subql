// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {isMainThread} from 'worker_threads';
import {EventEmitter2} from '@nestjs/event-emitter';
import {BaseDataSource, IProjectNetworkConfig} from '@subql/types-core';
import {Sequelize} from '@subql/x-sequelize';
import {IApi} from '../api.service';
import {IProjectUpgradeService, NodeConfig} from '../configure';
import {IndexerEvent} from '../events';
import {getLogger} from '../logger';
import {getExistingProjectSchema, getStartHeight, hasValue, initDbSchema, initHotSchemaReload, reindex} from '../utils';
import {BlockHeightMap} from '../utils/blockHeightMap';
import {BaseDsProcessorService} from './ds-processor.service';
import {DynamicDsService} from './dynamic-ds.service';
import {PoiService} from './poi/poi.service';
import {StoreService} from './store.service';
import {ISubqueryProject, IProjectService} from './types';
import {IUnfinalizedBlocksService} from './unfinalizedBlocks.service';

const logger = getLogger('Project');

class NotInitError extends Error {
  constructor() {
    super('ProjectService has not been initialized');
  }
}

export abstract class BaseProjectService<API extends IApi, DS extends BaseDataSource> implements IProjectService<DS> {
  private _schema?: string;
  private _startHeight?: number;
  private _blockOffset?: number;

  protected abstract packageVersion: string;
  protected abstract getBlockTimestamp(height: number): Promise<Date>;
  protected abstract onProjectChange(project: ISubqueryProject<IProjectNetworkConfig, DS>): void | Promise<void>;

  constructor(
    private readonly dsProcessorService: BaseDsProcessorService,
    protected readonly apiService: API,
    private readonly poiService: PoiService,
    protected readonly sequelize: Sequelize,
    protected readonly project: ISubqueryProject<IProjectNetworkConfig, DS>,
    protected readonly projectUpgradeService: IProjectUpgradeService<ISubqueryProject>,
    protected readonly storeService: StoreService,
    protected readonly nodeConfig: NodeConfig,
    protected readonly dynamicDsService: DynamicDsService<DS>,
    private eventEmitter: EventEmitter2,
    private unfinalizedBlockService: IUnfinalizedBlocksService<any>
  ) {
    if (this.nodeConfig.unsafe) {
      logger.warn(
        'UNSAFE MODE IS ENABLED. This is not recommended for most projects and will not be supported by our hosted service'
      );
    }
  }

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
    for await (const [, project] of this.projectUpgradeService.projects) {
      await project.applyCronTimestamps(this.getBlockTimestamp.bind(this));
    }

    // Do extra work on main thread to setup stuff
    if (isMainThread) {
      this._schema = await this.ensureProject();

      // Init metadata before rest of schema so we can determine the correct project version to create the schema
      await this.storeService.initCoreTables(this._schema);
      await this.dynamicDsService.init(this.storeService.storeCache.metadata);
      await this.ensureMetadata();
      const reindexedUpgrade = await this.initUpgradeService();

      await this.initDbSchema();

      await this.initHotSchemaReload();

      this._startHeight = await this.getStartHeight();

      const reindexedUnfinalized = await this.initUnfinalized();

      // Find the new start height based on some rewinding
      this._startHeight = Math.min(...[this._startHeight, reindexedUpgrade, reindexedUnfinalized].filter(hasValue));

      // Set the start height so the right project is used
      await this.projectUpgradeService.setCurrentHeight(this._startHeight);

      if (this.nodeConfig.proofOfIndex) {
        await this.poiService.init(this.schema);
        // Flush cache to set up rest of POI related meta
        void this.poiService.syncPoi(undefined);
      }

      // Flush any pending operations to set up DB
      await this.storeService.storeCache.flushCache(true, true);
    } else {
      this._schema = await this.getExistingProjectSchema();

      assert(this._schema, 'Schema should be created in main thread');
      await this.storeService.initCoreTables(this._schema);
      await this.initUpgradeService();
    }

    // Used to load assets into DS-processor, has to be done in any thread
    await this.dsProcessorService.validateProjectCustomDatasources(await this.getDataSources());
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
  }

  protected async getLastProcessedHeight(): Promise<number | undefined> {
    return this.storeService.storeCache.metadata.find('lastProcessedHeight');
  }

  private async getStartHeight(): Promise<number> {
    let startHeight: number;
    const lastProcessedHeight = await this.getLastProcessedHeight();

    if (hasValue(lastProcessedHeight)) {
      startHeight = Number(lastProcessedHeight) + 1;
    } else {
      startHeight = this.getStartBlockFromDataSources();
    }
    return startHeight;
  }

  getStartBlockFromDataSources(): number {
    try {
      return getStartHeight(this.project.dataSources);
    } catch (e: any) {
      logger.error(e);
      process.exit(1);
    }
  }

  // This is used everywhere but within indexing blocks, see comment on getDataSources for more info
  getAllDataSources(): DS[] {
    assert(isMainThread, 'This method is only avaiable on the main thread');
    const dataSources = this.project.dataSources;
    const dynamicDs = this.dynamicDsService.dynamicDatasources;

    return [...dataSources, ...dynamicDs];
  }

  // This gets used when indexing blocks, it needs to be async to ensure dynamicDs is updated within workers
  async getDataSources(blockHeight?: number): Promise<DS[]> {
    const dataSources = this.project.dataSources;
    const dynamicDs = await this.dynamicDsService.getDynamicDatasources();

    return [...dataSources, ...dynamicDs].filter(
      (ds) => blockHeight === undefined || (ds.startBlock !== undefined && ds.startBlock <= blockHeight)
    );
  }

  getDataSourcesMap(): BlockHeightMap<DS[]> {
    assert(isMainThread, 'This method is only avaiable on the main thread');
    const dynamicDs = this.dynamicDsService.dynamicDatasources;

    const dsMap = new Map<number, DS[]>();

    // Loop through all projects
    for (const [height, project] of this.projectUpgradeService.projects) {
      // Iterate all the DS at the project height
      [...project.dataSources, ...dynamicDs]
        .filter((ds): ds is DS & {startBlock: number} => !!ds.startBlock)
        .sort((a, b) => a.startBlock - b.startBlock)
        .forEach((ds, index, dataSources) => {
          dsMap.set(Math.max(height, ds.startBlock), dataSources.slice(0, index + 1));
        });
    }

    return new BlockHeightMap(dsMap);
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

  private async initUpgradeService(): Promise<number | undefined> {
    const metadata = this.storeService.storeCache.metadata;

    const upgradePoint = await this.projectUpgradeService.init(metadata, async () => {
      // Apply any migrations to the schema
      await this.initDbSchema();

      // Reload the dynamic ds with new project
      // TODO are we going to run into problems with this being non blocking
      await this.dynamicDsService.getDynamicDatasources(true);

      await this.onProjectChange(this.project);
    });

    // Called to allow handling the first project
    await this.onProjectChange(this.project);

    if (isMainThread) {
      const lastProcessedHeight = await this.getLastProcessedHeight();

      // New project or not using upgrades feature
      if (upgradePoint === undefined) {
        await this.projectUpgradeService.updateIndexedDeployments(
          this.project.id,
          lastProcessedHeight ?? this.getStartBlockFromDataSources()
        );
      } else {
        if (lastProcessedHeight && upgradePoint < lastProcessedHeight) {
          if (!this.isHistorical) {
            logger.error(
              `Unable to upgrade project. Cannot rewind to block ${upgradePoint} without historical indexing enabled.`
            );
            process.exit(1);
          }
          logger.info(`Rewinding project to preform project upgrade. Block height="${upgradePoint}"`);
          await this.reindex(upgradePoint);
          return upgradePoint;
        }
      }
    }
    return undefined;
  }

  async reindex(targetBlockHeight: number): Promise<void> {
    const lastProcessedHeight = await this.getLastProcessedHeight();

    if (lastProcessedHeight === undefined) {
      throw new Error('Cannot reindex with missing lastProcessedHeight');
    }

    return reindex(
      this.getStartBlockFromDataSources(),
      targetBlockHeight,
      lastProcessedHeight,
      this.storeService,
      this.unfinalizedBlockService,
      this.dynamicDsService,
      this.sequelize,
      this.nodeConfig.proofOfIndex ? this.poiService : undefined
      /* Not providing force clean service, it should never be needed */
    );
  }
}
