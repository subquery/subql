// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise } from '@polkadot/api';
import {
  buildSchema,
  getAllEntitiesRelations,
  isRuntimeDataSourceV0_2_0,
  RuntimeDataSrouceV0_0_1,
  SubqlKind,
  SubqlRuntimeDatasource,
} from '@subql/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { SubqueryModel, SubqueryRepo } from '../entities';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import * as SubstrateUtil from '../utils/substrate';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { MetadataFactory } from './entities/Metadata.entity';
import { IndexerEvent } from './events';
import { FetchService } from './fetch.service';
import { PoiService } from './poi.service';
import { PoiBlock } from './PoiBlock';
import { IndexerSandbox } from './sandbox';
import { StoreService } from './store.service';
import { BlockContent } from './types';

const DEFAULT_DB_SCHEMA = 'public';

const logger = getLogger('indexer');
const { argv } = getYargsOption();

function getProjectEntry(root: string): string {
  const pkgPath = path.join(root, 'package.json');
  try {
    const content = fs.readFileSync(pkgPath).toString();
    const pkg = JSON.parse(content);
    if (!pkg.main) {
      return './dist';
    }
    return pkg.main.startsWith('./') ? pkg.main : `./${pkg.main}`;
  } catch (err) {
    throw new Error(
      `can not find package.json within directory ${this.option.root}`,
    );
  }
}

@Injectable()
export class IndexerManager {
  private vms: IndexerSandbox[];
  private api: ApiPromise;
  private subqueryState: SubqueryModel;
  private prevSpecVersion?: number;
  private filteredDataSources: SubqlRuntimeDatasource[];

  constructor(
    protected apiService: ApiService,
    protected storeService: StoreService,
    protected fetchService: FetchService,
    protected poiService: PoiService,
    protected sequelize: Sequelize,
    protected project: SubqueryProject,
    protected nodeConfig: NodeConfig,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    private eventEmitter: EventEmitter2,
  ) {}

  @profiler(argv.profiler)
  async indexBlock({ block, events, extrinsics }: BlockContent): Promise<void> {
    const blockHeight = block.block.header.number.toNumber();
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height: blockHeight,
      timestamp: Date.now(),
    });
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);

    let poiBlockHash: Uint8Array;

    try {
      const inject = block.specVersion !== this.prevSpecVersion;
      await this.apiService.setBlockhash(block.block.hash, inject);
      for (const [index, ds] of this.filteredDataSources.entries()) {
        const vm = this.vms[index];
        if (ds.kind === SubqlKind.Runtime) {
          for (const handler of ds.mapping.handlers) {
            switch (handler.kind) {
              case SubqlKind.BlockHandler:
                if (SubstrateUtil.filterBlock(block, handler.filter)) {
                  await vm.securedExec(handler.handler, [block]);
                }
                break;
              case SubqlKind.CallHandler: {
                const filteredExtrinsics = SubstrateUtil.filterExtrinsics(
                  extrinsics,
                  handler.filter,
                );
                for (const e of filteredExtrinsics) {
                  await vm.securedExec(handler.handler, [e]);
                }
                break;
              }
              case SubqlKind.EventHandler: {
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
        // TODO: support Ink! and EVM
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
        poiBlock.mmrRoot = Buffer.from(
          `mmr${block.block.header.hash.toString()}`,
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
    await this.apiService.init();
    await this.fetchService.init();
    this.api = this.apiService.getApi();
    this.subqueryState = await this.ensureProject(this.nodeConfig.subqueryName);
    await this.initDbSchema();
    await this.ensureMetadata(this.subqueryState.dbSchema);
    if (this.nodeConfig.proofOfIndex) {
      await this.poiService.init(this.subqueryState.dbSchema);
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

    // Start VM for each data source
    this.vms = await Promise.all(
      this.filteredDataSources.map((dataSource) => {
        const entry = this.getDataSourceEntry(dataSource);
        return this.initVM(entry);
      }),
    );
  }

  private async initVM(entry: string): Promise<IndexerSandbox> {
    const api = await this.apiService.getPatchedApi();
    return new IndexerSandbox(
      {
        store: this.storeService.getStore(),
        api,
        root: this.project.path,
        entry,
      },
      this.nodeConfig,
    );
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

  private async ensureMetadata(schema: string) {
    const metadataRepo = MetadataFactory(this.sequelize, schema);
    //block offset should only been create once, never update.
    //if change offset will require re-index and re-sync poi
    const blockOffset = await metadataRepo.findOne({
      where: { key: 'blockOffset' },
    });
    if (!blockOffset) {
      const offsetValue = (this.getStartBlockFromDataSources() - 1).toString();
      await metadataRepo.create({
        key: 'blockOffset',
        value: offsetValue,
      });
    }
  }

  private async ensureProject(name: string): Promise<SubqueryModel> {
    let project = await this.subqueryRepo.findOne({
      where: { name: this.nodeConfig.subqueryName },
    });
    const { chain, genesisHash } = this.apiService.networkMeta;
    if (!project) {
      let projectSchema: string;
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
      project = await this.subqueryRepo.create({
        name,
        dbSchema: projectSchema,
        hash: '0x',
        nextBlockHeight: this.getStartBlockFromDataSources(),
        network: chain,
        networkGenesis: genesisHash,
      });
    } else {
      if (!project.networkGenesis || !project.network) {
        project.network = chain;
        project.networkGenesis = genesisHash;
        await project.save();
      } else if (project.networkGenesis !== genesisHash) {
        logger.error(
          `Not same network: genesisHash different - ${project.networkGenesis} : ${genesisHash}`,
        );
        process.exit(1);
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

  private filterDataSources(): SubqlRuntimeDatasource[] {
    const dataSourcesFilteredSpecName = this.getDataSourcesForSpecName();
    if (dataSourcesFilteredSpecName.length === 0) {
      logger.error(
        `Did not find any dataSource match with network specName ${this.api.runtimeVersion.specName}`,
      );
      process.exit(1);
    }
    const dataSourcesFilteredStartBlock = dataSourcesFilteredSpecName.filter(
      (ds) => ds.startBlock <= this.subqueryState.nextBlockHeight,
    );
    if (dataSourcesFilteredStartBlock.length === 0) {
      logger.error(
        `Your start block is greater than the current indexed block height in your database. Either change your startBlock (project.yaml) to <= ${this.subqueryState.nextBlockHeight} or delete your database and start again from the currently specified startBlock`,
      );
      process.exit(1);
    }
    return dataSourcesFilteredStartBlock;
  }

  private getDataSourcesForSpecName(): SubqlRuntimeDatasource[] {
    const specName = this.api.runtimeVersion.specName.toString();
    return this.project.dataSources.filter(
      (ds) =>
        isRuntimeDataSourceV0_2_0(ds) ||
        !!(ds as RuntimeDataSrouceV0_0_1).filter?.specName ||
        (ds as RuntimeDataSrouceV0_0_1).filter.specName === specName,
    );
  }

  private getDataSourceEntry(dataSource: SubqlRuntimeDatasource): string {
    if (isRuntimeDataSourceV0_2_0(dataSource)) {
      return dataSource.mapping.file;
    } else {
      return getProjectEntry(this.project.path);
    }
  }
}
