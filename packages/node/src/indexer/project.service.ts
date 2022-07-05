// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import fs from 'fs';
import { isMainThread } from 'worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getAllEntitiesRelations } from '@subql/utils';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { SubqueryRepo } from '../entities';
import { getLogger } from '../utils/logger';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { MetadataFactory, MetadataRepo } from './entities/Metadata.entity';
import { IndexerEvent } from './events';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { StoreService } from './store.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';

const logger = getLogger('Project');
const { argv } = getYargsOption();

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
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
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

  async init(): Promise<void> {
    // Do extra work on main thread to setup stuff
    if (isMainThread) {
      await this.dsProcessorService.validateProjectCustomDatasources();

      this._schema = await this.ensureProject();
      await this.initDbSchema();
      this.metadataRepo = await this.ensureMetadata();
      this.dynamicDsService.init(this.metadataRepo);

      if (this.nodeConfig.proofOfIndex) {
        const blockOffset = await this.getMetadataBlockOffset();
        if (blockOffset !== null && blockOffset !== undefined) {
          this.setBlockOffset(Number(blockOffset));
        }
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
    }
  }

  private async ensureProject(): Promise<string> {
    let schema = await this.getExistingProjectSchema();
    if (!schema) {
      schema = await this.createProjectSchema();
    } else {
      if (argv['force-clean']) {
        try {
          // drop existing project schema and metadata table
          await this.sequelize.dropSchema(`"${schema}"`, {
            logging: false,
            benchmark: false,
          });

          // remove schema from subquery table (might not exist)
          await this.sequelize.query(
            ` DELETE
              FROM public.subqueries
              WHERE name = :name`,
            {
              replacements: { name: this.nodeConfig.subqueryName },
              type: QueryTypes.DELETE,
            },
          );

          logger.info('force cleaned schema and tables');

          if (fs.existsSync(this.nodeConfig.mmrPath)) {
            await fs.promises.unlink(this.nodeConfig.mmrPath);
            logger.info('force cleaned file based mmr');
          }
        } catch (err) {
          logger.error(err, 'failed to force clean');
        }
        schema = await this.createProjectSchema();
      }
    }

    this.eventEmitter.emit(IndexerEvent.Ready, {
      value: true,
    });

    return schema;
  }

  // Get existing project schema, undefined when doesn't exist
  private async getExistingProjectSchema(): Promise<string> {
    let schema = this.nodeConfig.localMode
      ? DEFAULT_DB_SCHEMA
      : this.nodeConfig.dbSchema;

    // Note that sequelize.fetchAllSchemas does not include public schema, we cannot assume that public schema exists so we must make a raw query
    const schemas = (await this.sequelize
      .query(`SELECT schema_name FROM information_schema.schemata`, {
        type: QueryTypes.SELECT,
      })
      .then((xs) => xs.map((x: any) => x.schema_name))
      .catch((err) => {
        logger.error(`Unable to fetch all schemas: ${err}`);
        process.exit(1);
      })) as [string];

    if (!schemas.includes(schema)) {
      // fallback to subqueries table
      const subqueryModel = await this.subqueryRepo.findOne({
        where: { name: this.nodeConfig.subqueryName },
      });
      if (subqueryModel) {
        schema = subqueryModel.dbSchema;
      } else {
        schema = undefined;
      }
    }
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
    const graphqlSchema = this.project.schema;
    const modelsRelations = getAllEntitiesRelations(graphqlSchema);
    await this.storeService.init(modelsRelations, this.schema);
  }

  private async ensureMetadata(): Promise<MetadataRepo> {
    const metadataRepo = MetadataFactory(this.sequelize, this.schema);

    const project = await this.subqueryRepo.findOne({
      where: { name: this.nodeConfig.subqueryName },
    });

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
      if (project) {
        await metadataRepo.upsert({
          key: 'genesisHash',
          value: project.networkGenesis,
        });
      } else {
        await metadataRepo.upsert({ key: 'genesisHash', value: genesisHash });
      }
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

    if (keyValue.indexerNodeVersion !== packageVersion) {
      await metadataRepo.upsert({
        key: 'indexerNodeVersion',
        value: packageVersion,
      });
    }

    return metadataRepo;
  }

  async upsertMetadataBlockOffset(
    height: number,
    tx: Transaction,
  ): Promise<void> {
    await this.metadataRepo.upsert(
      {
        key: 'blockOffset',
        value: height,
      },
      { transaction: tx },
    );
  }

  async getMetadataBlockOffset(): Promise<number> {
    const res = await this.metadataRepo.findOne({
      where: { key: 'blockOffset' },
    });

    return res?.value as number;
  }

  async getLastProcessedHeight(): Promise<number> {
    const res = await this.metadataRepo.findOne({
      where: { key: 'lastProcessedHeight' },
    });

    return res?.value as number;
  }

  private async getStartHeight(): Promise<number> {
    let startHeight: number;
    const lastProcessedHeight = await this.getLastProcessedHeight();
    if (lastProcessedHeight !== null && lastProcessedHeight !== undefined) {
      startHeight = Number(lastProcessedHeight) + 1;
    } else {
      const project = await this.subqueryRepo.findOne({
        where: { name: this.nodeConfig.subqueryName },
      });
      if (project !== null) {
        startHeight = project.nextBlockHeight;
      } else {
        startHeight = this.getStartBlockFromDataSources();
      }
    }

    return startHeight;
  }

  // FIXME Dedupe with indexer manager
  setBlockOffset(offset: number): void {
    logger.info(`set blockOffset to ${offset}`);
    this._blockOffset = offset;
    void this.mmrService
      .syncFileBaseFromPoi(this.schema, offset)
      .catch((err) => {
        logger.error(err, 'failed to sync poi to mmr');
        process.exit(1);
      });
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
}
