// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from '@solana/web3.js';
import { getAllEntitiesRelations } from '@subql/common';
import {
  SubqlSolanaCustomDatasource,
  SecondLayerHandlerProcessor,
  RuntimeHandlerInputMap,
  SubqlSolanaHandlerKind,
  SubqlSolanaRuntimeHandler,
  SubqlSolanaCustomHandler,
  SubqlSolanaDatasource,
  SolanaBlock,
} from '@subql/types-solana';
import { QueryTypes, Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubquerySolanaProject } from '../configure/project.model';
import { SubqueryModel, SubqueryRepo } from '../entities';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { DsProcessorService } from './ds-processor.service';
import { MetadataFactory, MetadataRepo } from './entities/Metadata.entity';
import { IndexerEvent } from './events';
import { FetchService } from './fetch.service';
import { IndexerSandbox, SandboxService } from './sandbox.service';
import { StoreService } from './store.service';
import { BlockContent } from './types';
import {
  isBlockHandlerProcessor,
  isCustomSolanaDs,
  isRuntimeSolanaDs,
} from './utils';

//const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';

const logger = getLogger('indexer');
const { argv } = getYargsOption();

@Injectable()
export class IndexerSolanaManager {
  private api: Connection;
  private subqueryState: SubqueryModel;
  protected metadataRepo: MetadataRepo;
  private filteredDataSources: SubqlSolanaDatasource[];

  constructor(
    private storeService: StoreService,
    private apiService: ApiService,
    private fetchService: FetchService,
    //TODO: implement mmr and poi
    private sequelize: Sequelize,
    private project: SubquerySolanaProject,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxService,
    private dsProcessorService: DsProcessorService,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    private eventEmitter: EventEmitter2,
  ) {}

  @profiler(argv.profiler)
  async indexBlock(blockContent: BlockContent): Promise<void> {
    const { block } = blockContent;
    const blockHeight = +block.block.parentSlot + 1; // convert to block height
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height: blockHeight,
      timestamp: Date.now(),
    });
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);
    try {
      for (const ds of this.filteredDataSources) {
        const vm = this.sandboxService.getDsProcessor(ds);
        if (isRuntimeSolanaDs(ds)) {
          await this.indexBlockForRuntimeDs(
            vm,
            ds.mapping.handlers,
            blockContent,
          );
        } else if (isCustomSolanaDs(ds)) {
          logger.error('Not support custom datasource');
          process.exit(1);
          // await this.indexBlockForCustomDs(ds, vm, blockContent);
        }
      }
      await this.storeService.setMetadata(
        'lastProcessedHeight',
        blockHeight + 1,
      );
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    await tx.commit();
    this.fetchService.latestProcessed(blockHeight);
  }

  async start(): Promise<void> {
    await this.dsProcessorService.validateCustomDs();
    await this.fetchService.init();
    this.api = this.apiService.getApi();
    const schema = await this.ensureProject();
    await this.initDbSchema(schema);
    this.metadataRepo = await this.ensureMetadata(schema);

    // get current process block height
    let startHeight: number;
    const lastProcessedHeight = await this.metadataRepo.findOne({
      where: { key: 'lastProcessedHeight' },
    });
    if (lastProcessedHeight !== null && lastProcessedHeight.value !== null) {
      startHeight = Number(lastProcessedHeight.value) + 1;
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
    //TODO: implement POI
    logger.info(`startHeight ${startHeight}`);
    void this.fetchService.startLoop(startHeight).catch((err) => {
      logger.error(err, 'failed to fetch block');
      // FIXME: retry before exit
      process.exit(1);
    });
    this.filteredDataSources = this.filterDataSources(startHeight);
    this.fetchService.register((block) => this.indexBlock(block));
    //TODO: implement POI
  }

  // TODO: what this function used to do?
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

  // TODO: what this function used to do?
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

  // TODO: what this function used to do?
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

  // TODO: what this function used to do?
  private async initDbSchema(schema: string): Promise<void> {
    const graphqlSchema = this.project.schema;
    const modelsRelations = getAllEntitiesRelations(graphqlSchema);
    await this.storeService.init(modelsRelations, schema);
  }

  // TODO: what this function used to do?
  private async ensureMetadata(schema: string) {
    const metadataRepo = MetadataFactory(this.sequelize, schema);
    const { chainId } = this.apiService.networkMeta;

    this.eventEmitter.emit(
      IndexerEvent.NetworkMetadata,
      this.apiService.networkMeta,
    );

    const keys = ['blockOffset', 'chain', 'genesisHash'] as const;

    const entries = await metadataRepo.findAll({
      where: {
        key: keys,
      },
    });

    const keyValue = entries.reduce((arr, curr) => {
      arr[curr.key] = curr.value;
      return arr;
    }, {} as { [key in typeof keys[number]]: string });

    if (!keyValue.blockOffset) {
      const offsetValue = (this.getStartBlockFromDataSources() - 1).toString();
      await this.storeService.setMetadata('blockOffset', offsetValue);
    }

    if (keyValue.chain !== chainId) {
      await this.storeService.setMetadata('chain', chainId);
    }

    return metadataRepo;
  }

  private getStartBlockFromDataSources() {
    const startBlocksList = this.project.dataSources.map(
      (item) => item.startBlock ?? 1,
    );
    if (startBlocksList.length === 0) {
      logger.error(`Failed to find a valid datasource.`);
      process.exit(1);
    } else {
      return Math.min(...startBlocksList);
    }
  }

  private async nextSubquerySchemaSuffix(): Promise<number> {
    const seqExists = await this.sequelize.query(
      `SELECT 1
       FROM information_schema.sequences
       where sequence_schema = 'public'
         and sequence_name = 'subquery_schema_seq'`,
      {
        type: QueryTypes.SELECT,
      },
    );
    if (!seqExists.length) {
      await this.sequelize.query(
        `CREATE SEQUENCE subquery_schema_seq as integer START 1;`,
        { type: QueryTypes.RAW },
      );
    }
    const [{ nextval }] = await this.sequelize.query(
      `SELECT nextval('subquery_schema_seq')`,
      {
        type: QueryTypes.SELECT,
      },
    );
    return Number(nextval);
  }

  // TODO: what this function used to do?
  private filterDataSources(nextBlockHeight: number): SubqlSolanaDatasource[] {
    const ds = this.project.dataSources;
    if (ds.length === 0) {
      logger.error(`Did not find any datasource`);
      process.exit(1);
    }

    let filteredDs = ds.filter((ds) => ds.startBlock <= nextBlockHeight);
    if (filteredDs.length === 0) {
      logger.error(
        `Your start block is greater than the current indexed block height in your database. Either change your startBlock (project.yaml) to <= ${nextBlockHeight} or delete your database and start again from the currently specified startBlock`,
      );
      process.exit(1);
    }
    // perform filter for custom ds
    filteredDs = filteredDs.filter((ds) => {
      if (isCustomSolanaDs(ds)) {
        return this.dsProcessorService
          .getDsProcessor(ds)
          .dsFilterProcessor(ds, this.api as any);
      } else {
        return true;
      }
    });

    if (!filteredDs.length) {
      logger.error(`Did not find any datasources with associated processor`);
      process.exit(1);
    }
    return filteredDs;
  }

  private async indexBlockForRuntimeDs(
    vm: IndexerSandbox,
    handlers: SubqlSolanaRuntimeHandler[],
    { block }: BlockContent,
  ): Promise<void> {
    const solanaBlock: SolanaBlock = {
      block: block as any,
    };

    for (const handler of handlers) {
      switch (handler.kind) {
        case SubqlSolanaHandlerKind.Block:
          await vm.securedExec(handler.handler, [solanaBlock]);
          break;
        case SubqlSolanaHandlerKind.Transaction:
          for (const tx of block.block.transactions) {
            await vm.securedExec(handler.handler, [tx]);
          }
          break;
        default:
      }
    }
  }

  // TODO: implement this
  private async indexBlockForCustomDs(
    ds: SubqlSolanaCustomDatasource<string>,
    vm: IndexerSandbox,
    { block }: BlockContent,
  ): Promise<void> {
    const plugin = this.dsProcessorService.getDsProcessor(ds);
    const assets = await this.dsProcessorService.getAssets(ds);

    const processData = async <K extends SubqlSolanaHandlerKind>(
      processor: SecondLayerHandlerProcessor<K, unknown, unknown>,
      handler: SubqlSolanaCustomHandler<string>,
      filteredData: RuntimeHandlerInputMap[K][],
    ): Promise<void> => {
      const transformedData = await Promise.all(
        filteredData
          .filter((data) => processor.filterProcessor(handler.filter, data, ds))
          .map((data) =>
            processor.transformer(data, ds, this.api as any, assets),
          ),
      );

      for (const data of transformedData) {
        await vm.securedExec(handler.handler, [data]);
      }
    };

    for (const handler of ds.mapping.handlers) {
      const processor = plugin.handlerProcessors[handler.kind];
      if (isBlockHandlerProcessor(processor)) {
        await processData(processor, handler, [block]);
      }
    }
  }
}
