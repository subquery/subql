// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {isMainThread} from 'worker_threads';
import {Inject} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {BaseDataSource, IProjectNetworkConfig} from '@subql/types-core';
import {Sequelize} from '@subql/x-sequelize';
import {IApi} from '../api.service';
import {ICoreBlockchainService} from '../blockchain.service';
import {IProjectUpgradeService, NodeConfig} from '../configure';
import {IndexerEvent} from '../events';
import {getLogger} from '../logger';
import {exitWithError, monitorWrite} from '../process';
import {getExistingProjectSchema, getStartHeight, hasValue, mainThreadOnly, reindex} from '../utils';
import {BlockHeightMap} from '../utils/blockHeightMap';
import {DsProcessorService} from './ds-processor.service';
import {DynamicDsService} from './dynamic-ds.service';
import {MetadataKeys} from './entities';
import {MultiChainRewindService} from './multiChainRewind.service';
import {PoiSyncService} from './poi';
import {PoiService} from './poi/poi.service';
import {StoreService} from './store.service';
import {cacheProviderFlushData} from './storeModelProvider';
import {ISubqueryProject, IProjectService, BypassBlocks, HistoricalMode, Header} from './types';
import {IUnfinalizedBlocksService} from './unfinalizedBlocks.service';

const logger = getLogger('Project');

class NotInitError extends Error {
  constructor() {
    super('ProjectService has not been initialized');
  }
}

export class ProjectService<
  DS extends BaseDataSource = BaseDataSource,
  API extends IApi = IApi,
  UnfinalizedBlocksService extends IUnfinalizedBlocksService<any> = IUnfinalizedBlocksService<any>,
> implements IProjectService<DS>
{
  private _schema?: string;
  private _startHeight?: number;
  private _blockOffset?: number;

  constructor(
    private readonly dsProcessorService: DsProcessorService,
    @Inject('APIService') protected readonly apiService: API,
    @Inject(isMainThread ? PoiService : 'Null') private readonly poiService: PoiService,
    @Inject(isMainThread ? PoiSyncService : 'Null') private readonly poiSyncService: PoiSyncService,
    @Inject(isMainThread ? Sequelize : 'Null') private readonly sequelize: Sequelize,
    @Inject('ISubqueryProject') private readonly project: ISubqueryProject<IProjectNetworkConfig, DS>,
    @Inject('IProjectUpgradeService') private readonly projectUpgradeService: IProjectUpgradeService<ISubqueryProject>,
    @Inject(isMainThread ? StoreService : 'Null') private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    private readonly dynamicDsService: DynamicDsService<DS>,
    private eventEmitter: EventEmitter2,
    @Inject('IUnfinalizedBlocksService') private readonly unfinalizedBlockService: UnfinalizedBlocksService,
    @Inject('IBlockchainService') private blockchainService: ICoreBlockchainService<DS>,
    @Inject(isMainThread ? MultiChainRewindService : 'Null') private multiChainRewindService: MultiChainRewindService
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

  get bypassBlocks(): BypassBlocks {
    return this.project.network.bypassBlocks ?? [];
  }

  protected get isHistorical(): HistoricalMode {
    return this.storeService.historical;
  }

  protected async getExistingProjectSchema(): Promise<string | undefined> {
    return getExistingProjectSchema(this.nodeConfig, this.sequelize);
  }

  async init(startHeight?: number): Promise<void> {
    this.ensureTimezone();

    for (const [, project] of this.projectUpgradeService.projects) {
      await project.applyCronTimestamps(this.blockchainService.getBlockTimestamp.bind(this));
    }

    // Do extra work on main thread to setup stuff
    if (isMainThread) {
      this._schema = await this.ensureProject();

      // Init metadata before rest of schema so we can determine the correct project version to create the schema
      await this.storeService.initCoreTables(this._schema);

      await this.ensureMetadata();
      // DynamicDsService is dependent on metadata so we need to ensure it exists first
      await this.dynamicDsService.init(this.storeService.modelProvider.metadata);

      /**
       * WARNING: The order of the following steps is very important.
       *  * The right project needs to be used based on the start height which can change depending on rewinds
       *  * The DB needs to be init for unfinalized and project upgrades to run any rewinds
       * */

      this._startHeight = await this.nextProcessHeight();

      // Nothing is indexed, the first project is the default so we can use that start height
      if (this._startHeight === undefined) {
        this._startHeight = this.projectUpgradeService.currentHeight;
      }

      // These need to be init before upgrade and unfinalized services because they may cause rewinds.
      await this.initDbSchema();

      if (this.nodeConfig.proofOfIndex) {
        // Prepare for poi migration and creation
        await this.poiService.init(this.schema);
        // Sync poi from createdPoi to syncedPoi
        await this.poiSyncService.init(this.schema);
        void this.poiSyncService.syncPoi(undefined);
      }

      const reindexedUpgrade = await this.initUpgradeService(this.startHeight);

      const reindexMultiChain = await this.initMultiChainRewindService();

      // Unfinalized is dependent on POI in some cases, it needs to be init after POI is init
      const reindexedUnfinalized = await this.initUnfinalizedInternal();

      if (reindexedUnfinalized !== undefined) {
        this._startHeight = reindexedUnfinalized.blockHeight;
      }

      if (reindexedUpgrade !== undefined) {
        this._startHeight = reindexedUpgrade;
      }

      if (reindexMultiChain !== undefined) {
        this._startHeight = reindexMultiChain.blockHeight;
      }

      // Flush any pending operations to set up DB
      await cacheProviderFlushData(this.storeService.modelProvider, true);
    } else {
      assert(startHeight, 'ProjectService must be initialized with a start height in workers');
      this.projectUpgradeService.initWorker(startHeight, this.handleProjectChange.bind(this));

      // Called to allow handling the first project
      await this.blockchainService.onProjectChange(this.project);
    }

    // Used to load assets into DS-processor, has to be done in any thread
    await this.dsProcessorService.validateProjectCustomDatasources(await this.getDataSources());
  }

  private ensureTimezone(): void {
    const timezone = process.env.TZ;
    if (!timezone || timezone.toLowerCase() !== 'utc') {
      throw new Error(
        'Environment Timezone is not set to UTC. This may cause issues with indexing or proof of index\n Please try to set with "export TZ=UTC"'
      );
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

  private async initDbSchema(): Promise<void> {
    const tx = await this.sequelize.transaction();
    await this.storeService.init(this.schema, tx);
    await tx.commit();
  }

  private async ensureMetadata(): Promise<void> {
    const metadata = this.storeService.modelProvider.metadata;

    this.eventEmitter.emit(IndexerEvent.NetworkMetadata, this.apiService.networkMeta);

    const keys: (keyof MetadataKeys)[] = [
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
      'dynamicDatasources',
    ];

    const existing = await metadata.findMany(keys);

    const {chain, genesisHash, specName} = this.apiService.networkMeta;

    if (this.project.runner) {
      const {node, query} = this.project.runner;

      await metadata.setBulk([
        {key: 'runnerNode', value: node.name},
        {key: 'runnerNodeVersion', value: node.version},
        {key: 'runnerQuery', value: query.name},
        {key: 'runnerQueryVersion', value: query.version},
      ]);
    }
    if (!existing.genesisHash) {
      await metadata.set('genesisHash', genesisHash);
    } else {
      // Check if the configured genesisHash matches the currently stored genesisHash
      assert(
        genesisHash === existing.genesisHash,
        `Specified project manifest chain id / genesis hash does not match database stored genesis hash, consider cleaning project schema using "force-clean".\n Database genesis hash = "${existing.genesisHash}"\n Network genesis hash = "${genesisHash}"`
      );
    }
    if (existing.chain !== chain) {
      await metadata.set('chain', chain);
    }

    if (existing.specName !== specName) {
      await metadata.set('specName', specName);
    }

    // If project was created before this feature, don't add the key. If it is project created after, add this key.
    if (!existing.processedBlockCount && !existing.lastProcessedHeight) {
      await metadata.set('processedBlockCount', 0);
    }
    if (existing.indexerNodeVersion !== this.blockchainService.packageVersion) {
      await metadata.set('indexerNodeVersion', this.blockchainService.packageVersion);
    }
    if (!existing.schemaMigrationCount) {
      await metadata.set('schemaMigrationCount', 0);
    }
    if (!existing.startHeight) {
      await metadata.set('startHeight', this.getStartBlockFromDataSources());
    }

    if (!existing.dynamicDatasources) {
      await metadata.set('dynamicDatasources', []);
    } else if (typeof existing.dynamicDatasources === 'string') {
      // Migration Step: In versions  < 4.7.2 dynamic datasources was stored as a string in a json field.
      logger.info('Migrating dynamic datasources from string to object');
      await metadata.set('dynamicDatasources', JSON.parse(existing.dynamicDatasources));
    }
  }

  protected async getLastProcessedHeight(): Promise<number | undefined> {
    return this.storeService.modelProvider.metadata.find('lastProcessedHeight');
  }

  private async nextProcessHeight(): Promise<number | undefined> {
    const lastProcessedHeight = await this.getLastProcessedHeight();

    if (hasValue(lastProcessedHeight)) {
      return Number(lastProcessedHeight) + 1;
    }
    return undefined;
  }

  getStartBlockFromDataSources(): number {
    try {
      return getStartHeight(this.project.dataSources);
    } catch (e: any) {
      exitWithError(e, logger);
    }
  }

  getAllDataSources(): DS[] {
    assert(isMainThread, 'This method is only available on the main thread');
    const dataSources = this.project.dataSources;
    const dynamicDs = this.dynamicDsService.dynamicDatasources;

    return [...dataSources, ...dynamicDs];
  }

  hasDataSourcesAfterHeight(height: number): boolean {
    const datasourcesMap = this.getDataSourcesMap();
    //check if there are datasoures for current height
    if (datasourcesMap.get(height + 1).length) {
      return true;
    }

    //check for datasources with height after the current height
    const dataSources = datasourcesMap.getAll();
    return [...dataSources.entries()].some(([dsHeight, ds]) => dsHeight > height && ds.length);
  }

  async getDataSources(blockHeight?: number): Promise<DS[]> {
    const dataSources = this.project.dataSources;
    const dynamicDs = await this.dynamicDsService.getDynamicDatasources();

    return [...dataSources, ...dynamicDs].filter(
      (ds) =>
        blockHeight === undefined ||
        (ds.startBlock !== undefined &&
          ds.startBlock <= blockHeight &&
          (ds.endBlock === undefined || ds.endBlock >= blockHeight))
    );
  }

  @mainThreadOnly()
  getDataSourcesMap(): BlockHeightMap<DS[]> {
    const dynamicDs = this.dynamicDsService.dynamicDatasources;
    const dsMap = new Map<number, DS[]>();

    const projects = [...this.projectUpgradeService.projects];

    for (let i = 0; i < projects.length; i++) {
      const [height, project] = projects[i];
      let nextMinStartHeight: number;

      if (i + 1 < projects.length) {
        const nextProject = projects[i + 1][1];
        nextMinStartHeight = Math.max(
          nextProject.dataSources
            .filter((ds): ds is DS & {startBlock: number} => !!ds.startBlock)
            .sort((a, b) => a.startBlock - b.startBlock)[0].startBlock,
          projects[i + 1][0]
        );
      }

      const activeDataSources = new Set<DS>();
      //events denote addition or deletion of datasources from height-datasource map entries at the specified block height
      const events: {
        block: number; //block height at which addition or deletion of datasource should take place
        start: boolean; //if start=TRUE, add the datasource. otherwise remove the datasource.
        ds: DS;
      }[] = [];

      [...project.dataSources, ...dynamicDs]
        .filter((ds): ds is DS & {startBlock: number} => {
          return !!ds.startBlock && (!nextMinStartHeight || nextMinStartHeight > ds.startBlock);
        })
        .forEach((ds) => {
          events.push({block: Math.max(height, ds.startBlock), start: true, ds});
          if (ds.endBlock) events.push({block: ds.endBlock + 1, start: false, ds});
        });

      // sort events by block in ascending order, start events come before end events
      const sortedEvents = events.sort((a, b) => a.block - b.block || Number(b.start) - Number(a.start));

      sortedEvents.forEach((event) => {
        if (event.start) {
          activeDataSources.add(event.ds);
        } else {
          activeDataSources.delete(event.ds);
        }
        dsMap.set(event.block, Array.from(activeDataSources));
      });
    }

    return new BlockHeightMap(dsMap);
  }

  private async initUnfinalizedInternal(): Promise<Header | undefined> {
    if (this.nodeConfig.unfinalizedBlocks && !this.isHistorical) {
      exitWithError(
        'Unfinalized blocks cannot be enabled without historical. You will need to reindex your project to enable historical',
        logger
      );
    }

    return this.initUnfinalized();
  }

  protected async initUnfinalized(): Promise<Header | undefined> {
    return this.unfinalizedBlockService.init(this.reindex.bind(this));
  }

  /**
   * If the source project has changed this will align the ancestry of project upgrades. This can result in data being reindexed
   * @returns {number | undefined} - The height to continue indexing from
   * */
  private async initUpgradeService(startHeight: number): Promise<number | undefined> {
    const upgradePoint = await this.projectUpgradeService.init(
      this.storeService,
      startHeight,
      this.nodeConfig,
      this.sequelize,
      this.schema,
      this.handleProjectChange.bind(this)
    );

    // Called to allow handling the first project
    await this.blockchainService.onProjectChange(this.project);

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
            exitWithError(
              `Unable to upgrade project. Cannot rewind to block ${upgradePoint} without historical indexing enabled.`
            );
          }
          if (!this.projectUpgradeService.isRewindable) {
            exitWithError(`Due to dropped changes in schema migration, project cannot rewind`, logger);
          }
          const msg = `Rewinding project to preform project upgrade. Block height="${upgradePoint}"`;
          logger.info(msg);
          monitorWrite(msg);

          const timestamp = await this.blockchainService.getBlockTimestamp(upgradePoint);
          // Only timestamp and blockHeight are used with reindexing so its safe to convert to a header
          await this.reindex({
            blockHeight: upgradePoint,
            timestamp,
          } as Header);
          return upgradePoint + 1;
        }
      }
    }
    return undefined;
  }
  private async initMultiChainRewindService(): Promise<Header | undefined> {
    return this.multiChainRewindService.init(this.apiService.networkMeta.chain, this.reindex.bind(this));
  }

  private async handleProjectChange(): Promise<void> {
    if (isMainThread && !this.nodeConfig.allowSchemaMigration) {
      await this.initDbSchema();
    }

    // Reload the dynamic ds with new project
    await this.dynamicDsService.getDynamicDatasources(true);

    await this.blockchainService.onProjectChange(this.project);
  }

  async reindex(targetBlockHeader: Header): Promise<void> {
    const [height, timestamp] = await Promise.all([
      this.getLastProcessedHeight(),
      this.storeService.modelProvider.metadata.find('lastProcessedBlockTimestamp'),
    ]);

    if (height === undefined) {
      throw new Error('Cannot reindex with missing lastProcessedHeight');
    }

    return reindex(
      this.getStartBlockFromDataSources(),
      targetBlockHeader,
      {height, timestamp},
      this.storeService,
      this.unfinalizedBlockService,
      this.dynamicDsService,
      this.sequelize,
      this.projectUpgradeService,
      this.multiChainRewindService,
      this.nodeConfig.proofOfIndex ? this.poiService : undefined
      /* Not providing force clean service, it should never be needed */
    );
  }
}
