// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { isMainThread } from 'worker_threads';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HexString } from '@polkadot/util/types';
import {
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
import { initDbSchema } from '../utils/project';
import {yargsOptions} from '../yargs';
import { ApiService } from './api.service';
import { BestBlockService } from './bestBlock.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';

const logger = getLogger('Project');
const { argv } = yargsOptions;

type BestBlocks = Record<number, HexString>;

@Injectable()
export class ProjectService {
  private _schema: string;
  metadataRepo: MetadataRepo;
  private _startHeight: number;
  private _blockOffset: number;
  private _startBestBlocks: BestBlocks;

  constructor(
    private readonly dsProcessorService: DsProcessorService,
    private readonly apiService: ApiService,
    private readonly poiService: PoiService,
    protected readonly mmrService: MmrService,
    private readonly sequelize: Sequelize,
    private readonly project: SubqueryProject,
    private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    private readonly dynamicDsService: DynamicDsService,
    private eventEmitter: EventEmitter2,
    private bestBlockService: BestBlockService,
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

  get startBestBlocks(): BestBlocks {
    return this._startBestBlocks;
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
      this.apiService.getApi(),
    );
    if (isMainThread) {
      this._schema = await this.ensureProject();
      await this.initDbSchema();
      this.metadataRepo = await this.ensureMetadata();
      this.dynamicDsService.init(this.metadataRepo);

      if (this.nodeConfig.proofOfIndex) {
        const blockOffset = await this.getMetadataBlockOffset();
        void this.setBlockOffset(Number(blockOffset));
        await this.poiService.init(this.schema);
      }

      this._startHeight = await this.getStartHeight();
    } else {
      this.metadataRepo = MetadataFactory(this.sequelize, this.schema);

      this.dynamicDsService.init(this.metadataRepo);

      await this.sequelize.sync();

      this._schema = await this.getExistingProjectSchema();
      assert(this._schema, 'Schema should be created in main thread');
      await this.initDbSchema();

      if (this.nodeConfig.proofOfIndex) {
        await this.poiService.init(this.schema);
      }
    }

    // bestBlocks
    const startBestBlocks = await this.getMetadataBestBlocks();
    const LastFinalizedVerifiedHeight =
      await this.getLastFinalizedVerifiedHeight();
    if (argv['best-block']) {
      this._startBestBlocks = startBestBlocks ?? {};
      this.bestBlockService.init(
        this.metadataRepo,
        this.startBestBlocks,
        LastFinalizedVerifiedHeight,
      );
    } else {
      if (startBestBlocks !== undefined) {
        // Has previous indexed with bestBlocks, but discontinue to use best block in this run
        if (LastFinalizedVerifiedHeight < this._startHeight) {
          logger.info(
            `Found un-finalized block from previous indexing but unverified, discontinued fetch from un-finalized in this run will require to rollback to last finalized block ${LastFinalizedVerifiedHeight} `,
          );
          await this.reindex(LastFinalizedVerifiedHeight);
          this._startHeight = LastFinalizedVerifiedHeight;
          logger.info(
            `Successful rewind to block ${LastFinalizedVerifiedHeight} !`,
          );
        } else {
          // if finalized block haven't been process yet, then remove best blocks from both metadata and memory
          const transaction = await this.sequelize.transaction();
          await this.storeService.resetBestBlocks(transaction);
          await transaction.commit();
          this.bestBlockService.resetBestBlocks();
        }
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

  private async initDbSchema(): Promise<void> {
    await initDbSchema(this.project, this.schema, this.storeService);
  }

  private async ensureMetadata(): Promise<MetadataRepo> {
    const metadataRepo = MetadataFactory(this.sequelize, this.schema);

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
      'chainId',
      'processedBlockCount',
      'bestBlocks',
      'LastFinalizedVerifiedHeight',
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
        (this.project.network.chainId ?? genesisHash) === keyValue.genesisHash,
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
    if (!keyValue.bestBlocks) {
      await metadataRepo.upsert({
        key: 'bestBlocks',
        value: '{}',
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

  //string should be jsonb object
  async getMetadataBestBlocks(): Promise<BestBlocks | undefined> {
    const res = await this.metadataRepo.findOne({
      where: { key: 'bestBlocks' },
    });
    if (res) {
      return JSON.parse(res.value as string) as BestBlocks;
    }
    return undefined;
  }

  async getLastFinalizedVerifiedHeight(): Promise<number | undefined> {
    const res = await this.metadataRepo.findOne({
      where: { key: 'LastFinalizedVerifiedHeight' },
    });

    return res?.value as number | undefined;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getMetadataBlockOffset(): Promise<number | undefined> {
    return getMetaDataInfo(this.metadataRepo, 'blockOffset');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
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
    const startBlocksList = this.getDataSourcesForSpecName().map(
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

  private getDataSourcesForSpecName(): SubqlProjectDs[] {
    return this.project.dataSources.filter(
      (ds) =>
        !ds.filter?.specName ||
        ds.filter.specName ===
          this.apiService.getApi().runtimeVersion.specName.toString(),
    );
  }

  async reindex(targetBlockHeight: number): Promise<void> {
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
    // we don't need to consider metadata `LastFinalizedVerifiedHeight`,
    // as when reindex always equal to LastFinalizedVerifiedHeight
    const transaction = await this.sequelize.transaction();
    try {
      await this.storeService.rewind(targetBlockHeight, transaction);
      await this.storeService.resetBestBlocks(transaction);
      const blockOffset = await this.getMetadataBlockOffset();
      if (blockOffset) {
        await this.mmrService.deleteMmrNode(targetBlockHeight + 1, blockOffset);
      }
      await transaction.commit();
      this.bestBlockService.resetBestBlocks();
    } catch (err) {
      logger.error(err, 'Reindexing failed');
      await transaction.rollback();
      throw err;
    }
  }
}
