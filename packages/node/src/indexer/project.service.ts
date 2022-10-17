// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { isMainThread } from 'worker_threads';
import { Injectable } from '@nestjs/common';
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
import { SubqueryProject } from '../configure/SubqueryProject';
import { initDbSchema } from '../utils/project';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';

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
    private readonly project: SubqueryProject,
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

  private async getExistingProjectSchema(): Promise<string> {
    return getExistingProjectSchema(this.nodeConfig, this.sequelize);
  }

  async init(): Promise<void> {
    // Used to load assets into DS-processor, has to be done in any thread
    await this.dsProcessorService.validateProjectCustomDatasources();
    // Do extra work on main thread to setup stuff
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

    return metadataRepo;
  }

  async upsertMetadataBlockOffset(height: number): Promise<void> {
    await this.metadataRepo.upsert({
      key: 'blockOffset',
      value: height,
    });
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
}
