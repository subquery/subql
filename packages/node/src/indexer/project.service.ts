// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { isMainThread } from 'worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiService,
  MetadataFactory,
  MetadataRepo,
  NodeConfig,
  IndexerEvent,
  StoreService,
  PoiService,
  MmrService,
  getLogger,
  getExistingProjectSchema,
  getMetaDataInfo,
} from '@subql/node-core';
import { Sequelize } from 'sequelize';
import {
  generateTimestampReferenceForBlockFilters,
  SubqlProjectDs,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { initDbSchema, initHotSchemaReload } from '../utils/project';
import { reindex } from '../utils/reindex';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { BestBlocks } from './types';
import {
  METADATA_LAST_FINALIZED_PROCESSED_KEY,
  METADATA_UNFINALIZED_BLOCKS_KEY,
  UnfinalizedBlocksService,
} from './unfinalizedBlocks.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';

const logger = getLogger('Project');

@Injectable()
export class ProjectService {
  private _schema: string;
  private metadataRepo: MetadataRepo;
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
    private unfinalizedBlockService: UnfinalizedBlocksService,
  ) {}

  get schema(): string {
    return this._schema;
  }

  get dataSources(): SubqlProjectDs[] {
    return this.project.dataSources;
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

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getExistingProjectSchema(): Promise<string> {
    return getExistingProjectSchema(this.nodeConfig, this.sequelize);
  }

  async init(): Promise<void> {
    // Used to load assets into DS-processor, has to be done in any thread
    await this.dsProcessorService.validateProjectCustomDatasources();
    // Do extra work on main thread to setup stuff
    this.project.dataSources = await generateTimestampReferenceForBlockFilters(
      this.project.dataSources,
      this.apiService.api,
    );
    if (isMainThread) {
      this._schema = await this.ensureProject();
      await this.initDbSchema();
      this.metadataRepo = await this.ensureMetadata();
      this.dynamicDsService.init(this.metadataRepo);

      await this.initHotSchemaReload();

      if (this.nodeConfig.proofOfIndex) {
        const blockOffset = await this.getMetadataBlockOffset();
        void this.setBlockOffset(Number(blockOffset));
        await this.poiService.init(this.schema);
      }

      this._startHeight = await this.getStartHeight();
    } else {
      this._schema = await this.getExistingProjectSchema();
      this.metadataRepo = await MetadataFactory(
        this.sequelize,
        this.schema,
        this.nodeConfig.multiChain,
        this.project.network.chainId,
      );

      this.dynamicDsService.init(this.metadataRepo);

      await this.sequelize.sync();

      assert(this._schema, 'Schema should be created in main thread');
      await this.initDbSchema();

      if (this.nodeConfig.proofOfIndex) {
        await this.poiService.init(this.schema);
      }
    }

    if (this.nodeConfig.unfinalizedBlocks && !this.isHistorical) {
      logger.error(
        'Unfinalized blocks cannot be enabled without historical. You will need to reindex your project to enable historical',
      );
      process.exit(1);
    }

    const reindexedTo = await this.unfinalizedBlockService.init(
      this.metadataRepo,
      this.reindex.bind(this),
    );

    if (reindexedTo !== undefined) {
      this._startHeight = reindexedTo;
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

  private async ensureMetadata(): Promise<MetadataRepo> {
    const metadataRepo = await MetadataFactory(
      this.sequelize,
      this.schema,
      this.nodeConfig.multiChain,
      this.project.network.chainId,
    );

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
      'chainId',
      'processedBlockCount',
      'lastFinalizedVerifiedHeight',
      'schemaMigrationCount',
      'unfinalizedBlocks',
      'bypassBlocks',
    ] as const;

    const entries = await metadataRepo.findAll({
      where: {
        key: keys,
      },
    });

    const keyValue = entries.reduce((arr, curr) => {
      arr[curr.key] = curr.value;
      return arr;
    }, {} as { [key in typeof keys[number]]: string | boolean | number });

    const { chain, genesisHash, specName } = this.apiService.networkMeta;

    if (this.project.runner) {
      await Promise.all([
        metadataRepo.upsert({
          key: 'runnerNode',
          value: this.project.runner.node.name,
        }),
        metadataRepo.upsert({
          key: 'runnerNodeVersion',
          value: this.project.runner.node.version,
        }),
        metadataRepo.upsert({
          key: 'runnerQuery',
          value: this.project.runner.query.name,
        }),
        metadataRepo.upsert({
          key: 'runnerQueryVersion',
          value: this.project.runner.query.version,
        }),
      ]);
    }
    if (!keyValue.genesisHash) {
      await metadataRepo.upsert({ key: 'genesisHash', value: genesisHash });
    } else {
      // Check if the configured genesisHash matches the currently stored genesisHash
      assert(
        // Configured project yaml genesisHash only exists in specVersion v0.2.0, fallback to api fetched genesisHash on v0.0.1
        (this.project.network.genesisHash ?? genesisHash) ===
          keyValue.genesisHash,
        'Specified project manifest chain id / genesis hash does not match database stored genesis hash, consider cleaning project schema using --force-clean',
      );
    }
    if (keyValue.chain !== chain) {
      await metadataRepo.upsert({ key: 'chain', value: chain });
    }

    if (keyValue.specName !== specName) {
      await metadataRepo.upsert({ key: 'specName', value: specName });
    }

    // If project was created before this feature, don't add the key. If it is project created after, add this key.
    if (!keyValue.processedBlockCount && !keyValue.lastProcessedHeight) {
      await metadataRepo.upsert({ key: 'processedBlockCount', value: 0 });
    }

    if (keyValue.indexerNodeVersion !== packageVersion) {
      await metadataRepo.upsert({
        key: 'indexerNodeVersion',
        value: packageVersion,
      });
    }
    if (!keyValue.schemaMigrationCount) {
      await metadataRepo.upsert({ key: 'schemaMigrationCount', value: 0 });
    }

    if (!keyValue.unfinalizedBlocks) {
      await metadataRepo.upsert({
        key: 'unfinalizedBlocks',
        value: '{}',
      });
    }
    if (!keyValue.startHeight) {
      await metadataRepo.upsert({
        key: 'startHeight',
        value: this.getStartBlockFromDataSources(),
      });
    }

    return metadataRepo;
  }

  async upsertMetadataBlockOffset(height: number): Promise<void> {
    await this.metadataRepo.upsert({
      key: 'blockOffset',
      value: height,
    });
  }

  async getMetadataUnfinalizedBlocks(): Promise<BestBlocks | undefined> {
    const val = await getMetaDataInfo<string>(
      this.metadataRepo,
      METADATA_UNFINALIZED_BLOCKS_KEY,
    );
    if (val) {
      return JSON.parse(val) as BestBlocks;
    }
    return undefined;
  }

  async getLastFinalizedVerifiedHeight(): Promise<number | undefined> {
    return getMetaDataInfo(
      this.metadataRepo,
      METADATA_LAST_FINALIZED_PROCESSED_KEY,
    );
  }

  async getMetadataBlockOffset(): Promise<number | undefined> {
    return getMetaDataInfo(this.metadataRepo, 'blockOffset');
  }

  async getLastProcessedHeight(): Promise<number | undefined> {
    return getMetaDataInfo(this.metadataRepo, 'lastProcessedHeight');
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
      this._blockOffset ||
      offset === null ||
      offset === undefined ||
      isNaN(offset)
    ) {
      return;
    }
    logger.info(`set blockOffset to ${offset}`);
    this._blockOffset = offset;
    return this.mmrService
      .syncFileBaseFromPoi(this.schema, offset)
      .catch((err) => {
        logger.error(err, 'failed to sync poi to mmr');
        process.exit(1);
      });
  }
  async getProcessedBlockCount(): Promise<number> {
    const res = await this.metadataRepo.findOne({
      where: { key: 'processedBlockCount' },
    });

    return res?.value as number | undefined;
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

    return [...this.dataSources, ...dynamicDs].filter(
      (ds) => ds.startBlock <= blockHeight,
    );
  }
}
