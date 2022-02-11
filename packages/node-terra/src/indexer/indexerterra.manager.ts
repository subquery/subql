// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getAllEntitiesRelations } from '@subql/common';
import {
  SubqlTerraCustomDatasource,
  SubqlTerraHandlerKind,
  SubqlTerraRuntimeHandler,
  SecondLayerTerraHandlerProcessor,
  SubqlTerraCustomHandler,
  TerraRuntimeHandlerInputMap,
  SubqlTerraDatasource,
  TerraBlock,
  TerraEvent,
} from '@subql/types-terra';
import { LCDClient } from '@terra-money/terra.js';
import { QueryTypes, Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { SubqueryModel, SubqueryRepo } from '../entities';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import { filterEvents } from '../utils/terra-helper';
import { getYargsOption } from '../yargs';
import { ApiTerraService } from './apiterra.service';
import { MetadataFactory } from './entities/Metadata.entity';
import { IndexerEvent } from './events';
import { FetchTerraService } from './fetchterra.service';
import { IndexerSandbox, SandboxTerraService } from './sandboxterra.service';
import { StoreService } from './store.service';
import { TerraDsProcessorService } from './terrads-processor.service';
import { TerraBlockContent } from './types';
import {
  isBlockHandlerProcessor,
  isCustomTerraDs,
  isRuntimeTerraDs,
  isEventHandlerProcessor,
} from './utils';

//const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';

const logger = getLogger('indexer');
const { argv } = getYargsOption();

@Injectable()
export class IndexerTerraManager {
  private api: LCDClient;
  private subqueryState: SubqueryModel;
  private filteredDataSources: SubqlTerraDatasource[];

  constructor(
    private storeService: StoreService,
    private apiService: ApiTerraService,
    private fetchService: FetchTerraService,
    //TODO: implement mmr and poi
    private sequelize: Sequelize,
    private project: SubqueryTerraProject,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxTerraService,
    private dsProcessorService: TerraDsProcessorService,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    private eventEmitter: EventEmitter2,
  ) {}

  @profiler(argv.profiler)
  async indexBlock(blockContent: TerraBlockContent): Promise<void> {
    const { block } = blockContent;
    const blockHeight = +block.block.header.height;
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height: blockHeight,
      timestamp: Date.now(),
    });
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);
    try {
      for (const ds of this.filteredDataSources) {
        const vm = this.sandboxService.getDsProcessor(ds);
        if (isRuntimeTerraDs(ds)) {
          await this.indexBlockForRuntimeDs(
            vm,
            ds.mapping.handlers,
            blockContent,
          );
        } else if (isCustomTerraDs(ds)) {
          await this.indexBlockForCustomDs(ds, vm, blockContent);
        }
      }
      this.subqueryState.nextBlockHeight = +block.block.header.height + 1;
      await this.subqueryState.save({ transaction: tx });

      //TODO: implement POI
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    await tx.commit();
    this.fetchService.latestProcessed(+block.block.header.height);
  }

  async start(): Promise<void> {
    await this.dsProcessorService.validateCustomDs();
    await this.fetchService.init();
    this.api = this.apiService.getApi();
    const schema = await this.ensureProject();
    await this.initDbSchema(schema);
    await this.ensureMetadata(this.subqueryState.dbSchema);
    //TODO: implement POI
    logger.info(`${this.subqueryState.nextBlockHeight}`);
    void this.fetchService
      .startLoop(this.subqueryState.nextBlockHeight)
      .catch((err) => {
        logger.error(err, 'failed to fetch block');
        // FIXME: retry before exit
        process.exit(1);
      });
    this.filteredDataSources = this.filterDataSources();
    this.fetchService.register((block) => this.indexBlock(block));
    //TODO: implement POI
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

  private async initDbSchema(schema: string): Promise<void> {
    const graphqlSchema = this.project.schema;
    const modelsRelations = getAllEntitiesRelations(graphqlSchema);
    await this.storeService.init(modelsRelations, schema);
  }

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

  private filterDataSources(): SubqlTerraDatasource[] {
    const ds = this.project.dataSources;
    if (ds.length === 0) {
      logger.error(`Did not find any datasource`);
      process.exit(1);
    }
    let filteredDs = ds.filter(
      (ds) => ds.startBlock <= this.subqueryState.nextBlockHeight,
    );
    if (filteredDs.length === 0) {
      logger.error(
        `Your start block is greater than the current indexed block height in your database. Either change your startBlock (project.yaml) to <= ${this.subqueryState.nextBlockHeight} or delete your database and start again from the currently specified startBlock`,
      );
      process.exit(1);
    }
    // perform filter for custom ds
    filteredDs = filteredDs.filter((ds) => {
      if (isCustomTerraDs(ds)) {
        return this.dsProcessorService
          .getDsProcessor(ds)
          .dsFilterProcessor(ds, this.api);
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
    handlers: SubqlTerraRuntimeHandler[],
    { block, events }: TerraBlockContent,
  ): Promise<void> {
    const terraBlock: TerraBlock = {
      block: block,
    };

    for (const handler of handlers) {
      switch (handler.kind) {
        case SubqlTerraHandlerKind.Block:
          await vm.securedExec(handler.handler, [terraBlock]);
          break;
        case SubqlTerraHandlerKind.Event: {
          const filteredEvents = filterEvents(events, handler.filter);
          for (const e of filteredEvents) {
            const terraEvent: TerraEvent = {
              event: e,
              block: block,
            };
            await vm.securedExec(handler.handler, [terraEvent]);
          }
          break;
        }
        default:
      }
    }
  }

  private async indexBlockForCustomDs(
    ds: SubqlTerraCustomDatasource<string>,
    vm: IndexerSandbox,
    { block, events }: TerraBlockContent,
  ): Promise<void> {
    const plugin = this.dsProcessorService.getDsProcessor(ds);
    const assets = await this.dsProcessorService.getAssets(ds);

    const processData = async <K extends SubqlTerraHandlerKind>(
      processor: SecondLayerTerraHandlerProcessor<K, unknown, unknown>,
      handler: SubqlTerraCustomHandler<string>,
      filteredData: TerraRuntimeHandlerInputMap[K][],
    ): Promise<void> => {
      const transformedData = await Promise.all(
        filteredData
          .filter((data) => processor.filterProcessor(handler.filter, data, ds))
          .map((data) => processor.transformer(data, ds, this.api, assets)),
      );

      for (const data of transformedData) {
        await vm.securedExec(handler.handler, [data]);
      }
    };

    for (const handler of ds.mapping.handlers) {
      const processor = plugin.handlerProcessors[handler.kind];
      if (isBlockHandlerProcessor(processor)) {
        await processData(processor, handler, [block]);
      } else if (isEventHandlerProcessor(processor)) {
        const filteredEvents = filterEvents(events, processor.baseFilter);
        await processData(processor, handler, filteredEvents);
      }
    }
  }
}
