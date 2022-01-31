// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { buildSchema, getAllEntitiesRelations } from '@subql/common';
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
    this.eventEmitter.emit(IndexerEvent.BlockLastProcessed, {
      height: blockHeight,
      timestamp: Date.now(),
    });
  }

  async start(): Promise<void> {
    await this.dsProcessorService.validateCustomDs();
    await this.fetchService.init();
    this.api = this.apiService.getApi();
    this.subqueryState = await this.ensureProject(this.nodeConfig.subqueryName);
    await this.initDbSchema();
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

  private async ensureProject(name: string): Promise<SubqueryModel> {
    let project = await this.subqueryRepo.findOne({
      where: { name: this.nodeConfig.subqueryName },
    });
    const { chainId } = this.apiService.networkMeta;
    if (!project) {
      project = await this.createProjectSchema(name);
    } else {
      if (argv['force-clean']) {
        try {
          await this.sequelize.dropSchema(project.dbSchema, {
            logging: false,
            benchmark: false,
          });

          await this.sequelize.query(
            ` DELETE
              FROM public.subqueries
              where db_schema = :subquerySchema`,
            {
              replacements: { subquerySchema: project.dbSchema },
              type: QueryTypes.DELETE,
            },
          );
          logger.info('force cleaned schema and tables');
        } catch (err) {
          logger.error(err, 'failed to force clean schema and tables');
        }
        project = await this.createProjectSchema(name);
      }
      if (!project.network) {
        project.network = chainId;
        await project.save();
      }
    }
    return project;
  }

  private async initDbSchema(): Promise<void> {
    const schema = this.subqueryState.dbSchema;
    const graphqlSchema = buildSchema(
      path.join(this.project.path, this.project.schema),
    );
    const modelsRelations = getAllEntitiesRelations(graphqlSchema);
    await this.storeService.init(modelsRelations, schema);
    //TODO: ensure store service is terra compliant
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

  private async createProjectSchema(name: string): Promise<SubqueryModel> {
    let projectSchema: string;
    const { chainId } = this.apiService.networkMeta;
    if (this.nodeConfig.localMode) {
      projectSchema = DEFAULT_DB_SCHEMA;
    } else {
      const suffix = await this.nextSubquerySchemaSuffix();
      projectSchema = `subquery_${suffix}`;
      const schemas = await this.sequelize.showAllSchemas(undefined);
      if (!(schemas as unknown as string[]).includes(projectSchema)) {
        await this.sequelize.createSchema(projectSchema, undefined);
      }
    }
    return this.subqueryRepo.create({
      name,
      dbSchema: projectSchema,
      hash: '0x',
      nextBlockHeight: this.getStartBlockFromDataSources(),
      network: chainId,
    });
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
