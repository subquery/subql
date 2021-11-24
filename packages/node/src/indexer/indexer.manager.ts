// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise } from '@polkadot/api';
import {
  buildSchema,
  getAllEntitiesRelations,
  isBlockHandlerProcessor,
  isCallHandlerProcessor,
  isEventHandlerProcessor,
  isCustomDs,
  isRuntimeDs,
} from '@subql/common';
import {
  RuntimeHandlerInputMap,
  SecondLayerHandlerProcessor,
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlDatasource,
  SubqlHandlerKind,
  SubqlNetworkFilter,
  SubqlRuntimeHandler,
} from '@subql/types';
import { QueryTypes, Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { SubqueryModel, SubqueryRepo } from '../entities';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import * as SubstrateUtil from '../utils/substrate';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { DsProcessorService } from './ds-processor.service';
import { MetadataFactory, MetadataRepo } from './entities/Metadata.entity';
import { IndexerEvent } from './events';
import { FetchService } from './fetch.service';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { PoiBlock } from './PoiBlock';
import { IndexerSandbox, SandboxService } from './sandbox.service';
import { StoreService } from './store.service';
import { BlockContent } from './types';

const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';

const logger = getLogger('indexer');
const { argv } = getYargsOption();

@Injectable()
export class IndexerManager {
  private api: ApiPromise;
  private subqueryState: SubqueryModel;
  private prevSpecVersion?: number;
  private filteredDataSources: SubqlDatasource[];
  metaDataRepo: MetadataRepo;

  constructor(
    private storeService: StoreService,
    private apiService: ApiService,
    private fetchService: FetchService,
    private poiService: PoiService,
    protected mmrService: MmrService,
    private sequelize: Sequelize,
    private project: SubqueryProject,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxService,
    private dsProcessorService: DsProcessorService,
    // @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    private eventEmitter: EventEmitter2,
  ) {}

  @profiler(argv.profiler)
  async indexBlock(blockContent: BlockContent): Promise<void> {
    const { block } = blockContent;
    const blockHeight = block.block.header.number.toNumber();
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height: blockHeight,
      timestamp: Date.now(),
    });
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);

    let poiBlockHash: Uint8Array;
    try {
      const isUpgraded = block.specVersion !== this.prevSpecVersion;
      // if parentBlockHash injected, which means we need to check runtime upgrade
      const apiAt = await this.apiService.getPatchedApi(
        block.block.hash,
        isUpgraded ? block.block.header.parentHash : undefined,
      );
      for (const ds of this.filteredDataSources) {
        const vm = this.sandboxService.getDsProcessor(ds, apiAt);
        if (isRuntimeDs(ds)) {
          await this.indexBlockForRuntimeDs(
            vm,
            ds.mapping.handlers,
            blockContent,
          );
        } else if (isCustomDs(ds)) {
          await this.indexBlockForCustomDs(ds, vm, blockContent);
        }
      }
      this.subqueryState.nextBlockHeight =
        block.block.header.number.toNumber() + 1;
      await this.subqueryState.save({ transaction: tx });
      if (this.nodeConfig.proofOfIndex) {
        const operationHash = this.storeService.getOperationMerkleRoot();
        const poiBlock = PoiBlock.create(
          blockHeight,
          block.block.header.hash.toHex(),
          operationHash,
          await this.poiService.getLatestPoiBlockHash(),
          this.project.path, //projectId // TODO, define projectId
        );
        poiBlockHash = poiBlock.hash;
        await this.storeService.setPoi(tx, poiBlock);
      }
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    await tx.commit();
    this.fetchService.latestProcessed(block.block.header.number.toNumber());
    this.prevSpecVersion = block.specVersion;
    if (this.nodeConfig.proofOfIndex) {
      this.poiService.setLatestPoiBlockHash(poiBlockHash);
    }

    this.eventEmitter.emit(IndexerEvent.BlockLastProcessed, {
      height: blockHeight,
      timestamp: Date.now(),
    });
  }

  async start(): Promise<void> {
    await this.dsProcessorService.validateCustomDs();
    await this.fetchService.init();
    this.api = this.apiService.getApi();

    const projectSchema = await this.ensureProject(
      this.nodeConfig.subqueryName,
    );
    await this.initDbSchema();
    await this.ensureMetadata();

    if (this.nodeConfig.proofOfIndex) {
      await Promise.all([
        this.poiService.init(projectSchema),
        this.mmrService.init(projectSchema),
      ]);
    }

    void this.fetchService
      .startLoop(this.subqueryState.nextBlockHeight)
      .catch((err) => {
        logger.error(err, 'failed to fetch block');
        // FIXME: retry before exit
        process.exit(1);
      });
    this.filteredDataSources = this.filterDataSources();
    this.fetchService.register((block) => this.indexBlock(block));

    if (this.nodeConfig.proofOfIndex) {
      void this.mmrService.syncFileBaseFromPoi().catch((err) => {
        logger.error(err, 'failed to sync poi to mmr');
        process.exit(1);
      });
    }
  }

  // Ensure that the project schema has been created, drop and recreate schema if configured to force clean
  private async ensureProject(projectName: string): Promise<string> {
    let projectSchema;
    if (!this.project.schema) {
      projectSchema = await this.createProjectSchema(projectName);
    } else {
      if (argv['force-clean']) {
        try {
          // drop existing project schema
          this.sequelize.dropSchema(projectSchema, {
            logging: false,
            benchmark: false,
          });

          logger.info('force cleaned schema and tables');
        } catch (err) {
          logger.error(err, 'failed to force clean schema and tables');
        }
        projectSchema = await this.createProjectSchema(projectName);
        this.metaDataRepo = MetadataFactory(this.sequelize, projectSchema);
      }
    }
    return projectSchema;
  }

  private async initDbSchema(): Promise<void> {
    const graphqlSchema = buildSchema(
      path.join(this.project.path, this.project.schema), // XXX: is this the right project schema?
    );
    const modelsRelations = getAllEntitiesRelations(graphqlSchema);
    await this.storeService.init(modelsRelations, this.project.schema);
  }

  private async ensureMetadata() {
    const { chain, genesisHash, specName } = this.apiService.networkMeta;

    this.eventEmitter.emit(
      IndexerEvent.NetworkMetadata,
      this.apiService.networkMeta,
    );

    const keys = [
      'name',
      'blockOffset',
      'indexerNodeVersion',
      'chain',
      'specName',
      'genesisHash',
    ] as const;

    const entries = await this.metaDataRepo.findAll({
      where: {
        key: keys,
      },
    });

    const keyValue = entries.reduce((arr, curr) => {
      arr[curr.key] = curr.value;
      return arr;
    }, {} as { [key in typeof keys[number]]: string | boolean | number });

    if ((await this.getMetadata('genesisHash')) !== genesisHash) {
      logger.error(
        `Not same network: genesisHash different. expected="${await this.getMetadata(
          'genesisHash',
        )}"" actual="${genesisHash}"`,
      );
      process.exit(1);
    }

    //blockOffset, name and genesisHash should only been created once, never updated
    //if blockOffset is changed, it will required to re-index and re-sync poi.
    if (!keyValue.name) {
      await this.setMetadata('name', this.nodeConfig.subqueryName);
    }
    if (!keyValue.blockOffset) {
      const offsetValue = (this.getStartBlockFromDataSources() - 1).toString();
      await this.setMetadata('blockOffset', offsetValue);
    }

    if (!keyValue.genesisHash) {
      await this.setMetadata('genesisHash', genesisHash);
    }

    if (keyValue.chain !== chain) {
      await this.setMetadata('chain', chain);
    }

    if (keyValue.specName !== specName) {
      await this.setMetadata('specName', specName);
    }

    if (keyValue.indexerNodeVersion !== packageVersion) {
      await this.setMetadata('indexerNodeVersion', packageVersion);
    }
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

  // Create the schema for the project and initialize the metadata
  private async createProjectSchema(name: string): Promise<string> {
    let projectSchema: string;
    const { chain, genesisHash } = this.apiService.networkMeta;
    if (this.nodeConfig.localMode) {
      // create tables in default schema if local mode is enabled
      projectSchema = DEFAULT_DB_SCHEMA;
    } else {
      const suffix = await this.nextSubquerySchemaSuffix();
      projectSchema = `subquery_${suffix}`;
      const schemas = await this.sequelize.showAllSchemas(undefined);
      if (!(schemas as unknown as string[]).includes(projectSchema)) {
        await this.sequelize.createSchema(projectSchema, undefined);
      }
    }
    this.metaDataRepo = MetadataFactory(this.sequelize, projectSchema);
    await this.setMetadata('name', name);
    await this.setMetadata(
      'lastProcessedHeight',
      this.getStartBlockFromDataSources(),
    );
    await this.setMetadata('chain', chain);
    await this.setMetadata('genesisHash', genesisHash);
    return projectSchema;
  }

  // async getProjectSchema(projectName: string): Promise<string> {
  //   const result = await this.sequelize
  //     .query(
  //       `SELECT schema_name FROM  information_schema.schemata WHERE schema_name LIKE 'subquery_%'`,
  //       {
  //         type: QueryTypes.SELECT,
  //       },
  //     )
  //     .then((obj: [{ schema_name: string }]) => obj.map((x) => x.schema_name));
  //   if (result.length === 0) {
  //     return undefined
  //   }
  //   for (const schema of result) {
  //     const isSchema = await this.sequelize.query(
  //       `SELECT 1
  //     FROM ${schema}._metadata
  //     WHERE key = 'projectName' AND value::jsonb->>0 = '${projectName}' `,
  //       {
  //         type: QueryTypes.SELECT,
  //       },
  //     );
  //     if (isSchema) {
  //       return schema;
  //     }
  //   }
  //   return undefined;
  // }

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

  private filterDataSources(): SubqlDatasource[] {
    let filteredDs = this.getDataSourcesForSpecName();
    if (filteredDs.length === 0) {
      logger.error(
        `Did not find any dataSource match with network specName ${this.api.runtimeVersion.specName}`,
      );
      process.exit(1);
    }
    filteredDs = filteredDs.filter(
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
      if (isCustomDs(ds)) {
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

  private getDataSourcesForSpecName(): SubqlDatasource[] {
    return this.project.dataSources.filter(
      (ds) =>
        !ds.filter?.specName ||
        ds.filter.specName === this.api.runtimeVersion.specName.toString(),
    );
  }

  private async indexBlockForRuntimeDs(
    vm: IndexerSandbox,
    handlers: SubqlRuntimeHandler[],
    { block, events, extrinsics }: BlockContent,
  ): Promise<void> {
    for (const handler of handlers) {
      switch (handler.kind) {
        case SubqlHandlerKind.Block:
          if (SubstrateUtil.filterBlock(block, handler.filter)) {
            await vm.securedExec(handler.handler, [block]);
          }
          break;
        case SubqlHandlerKind.Call: {
          const filteredExtrinsics = SubstrateUtil.filterExtrinsics(
            extrinsics,
            handler.filter,
          );
          for (const e of filteredExtrinsics) {
            await vm.securedExec(handler.handler, [e]);
          }
          break;
        }
        case SubqlHandlerKind.Event: {
          const filteredEvents = SubstrateUtil.filterEvents(
            events,
            handler.filter,
          );
          for (const e of filteredEvents) {
            await vm.securedExec(handler.handler, [e]);
          }
          break;
        }
        default:
      }
    }
  }

  private async indexBlockForCustomDs(
    ds: SubqlCustomDatasource<string, SubqlNetworkFilter>,
    vm: IndexerSandbox,
    { block, events, extrinsics }: BlockContent,
  ): Promise<void> {
    const plugin = this.dsProcessorService.getDsProcessor(ds);
    const assets = await this.dsProcessorService.getAssets(ds);

    const processData = async <K extends SubqlHandlerKind>(
      processor: SecondLayerHandlerProcessor<K, unknown, unknown>,
      handler: SubqlCustomHandler<string, Record<string, unknown>>,
      filteredData: RuntimeHandlerInputMap[K][],
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
      } else if (isCallHandlerProcessor(processor)) {
        const filteredExtrinsics = SubstrateUtil.filterExtrinsics(
          extrinsics,
          processor.baseFilter,
        );
        await processData(processor, handler, filteredExtrinsics);
      } else if (isEventHandlerProcessor(processor)) {
        const filteredEvents = SubstrateUtil.filterEvents(
          events,
          processor.baseFilter,
        );
        await processData(processor, handler, filteredEvents);
      }
    }
  }

  async setMetadata(
    key: string,
    value: string | number | boolean,
  ): Promise<void> {
    assert(this.metaDataRepo, `model _metadata does not exist`);
    await this.metaDataRepo.upsert({ key, value });
  }

  async getMetadata(key: string): Promise<string | number | boolean> {
    assert(this.metaDataRepo, `model _metadata does not exist`);
    return this.metaDataRepo
      .findOne({ where: { key: key } })
      .then((res) => res.value);
  }
}
