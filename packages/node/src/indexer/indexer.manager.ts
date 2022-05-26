// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { hexToU8a, u8aEq } from '@polkadot/util';
import {
  isBlockHandlerProcessor,
  isTransactionHandlerProcessor,
  isMessageHandlerProcessor,
  isEventHandlerProcessor,
  isCustomCosmosDs,
  isRuntimeCosmosDs,
  SubqlCosmosCustomDataSource,
  SubqlCosmosCustomHandler,
  SubqlCosmosHandlerKind,
  CosmosRuntimeHandlerInputMap,
} from '@subql/common-cosmos';
import {
  CosmosBlock,
  CosmosEvent,
  CosmosMessage,
  CosmosTransaction,
} from '@subql/types-cosmos';
import { getAllEntitiesRelations } from '@subql/utils';
import { QueryTypes, Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { SubqueryRepo } from '../entities';
import * as CosmosUtil from '../utils/cosmos';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import { getYargsOption } from '../yargs';
import { ApiService, CosmosClient } from './api.service';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
  isSecondLayerHandlerProcessor_0_0_0,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { MetadataFactory, MetadataRepo } from './entities/Metadata.entity';
import { IndexerEvent } from './events';
import { FetchService } from './fetch.service';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { PoiBlock } from './PoiBlock';
import { IndexerSandbox, SandboxService } from './sandbox.service';
import { StoreService } from './store.service';
import { BlockContent } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';
const NULL_MERKEL_ROOT = hexToU8a('0x00');

const logger = getLogger('indexer');
const { argv } = getYargsOption();

@Injectable()
export class IndexerManager {
  private api: CosmosClient;
  protected metadataRepo: MetadataRepo;
  private filteredDataSources: SubqlProjectDs[];
  private blockOffset: number;
  private schema: string;

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
    private dynamicDsService: DynamicDsService,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    private eventEmitter: EventEmitter2,
  ) {}

  @profiler(argv.profiler)
  async indexBlock(blockContent: BlockContent): Promise<void> {
    const { block } = blockContent;
    const blockHeight = block.block.header.height;
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height: blockHeight,
      timestamp: Date.now(),
    });
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);
    this.storeService.setBlockHeight(blockHeight);

    let poiBlockHash: Uint8Array;
    try {
      const safeApi = await this.apiService.getSafeApi(
        block.block.header.height,
      );

      const datasources = this.filteredDataSources.concat(
        ...(await this.dynamicDsService.getDynamicDatasources()),
      );

      await this.indexBlockData(
        blockContent,
        datasources,
        (ds: SubqlProjectDs) => {
          const vm = this.sandboxService.getDsProcessor(ds, safeApi);

          // Inject function to create ds into vm
          vm.freeze(
            async (templateName: string, args?: Record<string, unknown>) => {
              const newDs = await this.dynamicDsService.createDynamicDatasource(
                {
                  templateName,
                  args,
                  startBlock: blockHeight,
                },
                tx,
              );

              // Push the newly created dynamic ds to be processed this block on any future extrinsics/events
              datasources.push(newDs);
            },
            'createDynamicDatasource',
          );

          return vm;
        },
      );

      await this.storeService.setMetadataBatch(
        [
          { key: 'lastProcessedHeight', value: blockHeight },
          { key: 'lastProcessedTimestamp', value: Date.now() },
        ],
        { transaction: tx },
      );
      // Need calculate operationHash to ensure correct offset insert all time
      const operationHash = this.storeService.getOperationMerkleRoot();
      if (
        !u8aEq(operationHash, NULL_MERKEL_ROOT) &&
        this.blockOffset === undefined
      ) {
        await this.metadataRepo.upsert(
          {
            key: 'blockOffset',
            value: blockHeight - 1,
          },
          { transaction: tx },
        );
        this.setBlockOffset(blockHeight - 1);
      }

      if (this.nodeConfig.proofOfIndex) {
        //check if operation is null, then poi will not be inserted
        if (!u8aEq(operationHash, NULL_MERKEL_ROOT)) {
          const poiBlock = PoiBlock.create(
            blockHeight,
            block.block.id,
            operationHash,
            await this.poiService.getLatestPoiBlockHash(),
            this.project.id,
          );
          poiBlockHash = poiBlock.hash;
          await this.storeService.setPoi(poiBlock, { transaction: tx });
          this.poiService.setLatestPoiBlockHash(poiBlockHash);
          await this.storeService.setMetadataBatch(
            [{ key: 'lastPoiHeight', value: blockHeight }],
            { transaction: tx },
          );
        }
      }
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    await tx.commit();
    this.fetchService.latestProcessed(block.block.header.height);
  }

  async start(): Promise<void> {
    await this.dsProcessorService.validateProjectCustomDatasources();
    await this.fetchService.init();
    this.api = this.apiService.getApi();
    this.schema = await this.ensureProject();
    await this.initDbSchema();
    this.metadataRepo = await this.ensureMetadata();
    this.dynamicDsService.init(this.metadataRepo);

    if (this.nodeConfig.proofOfIndex) {
      const blockOffset = await this.metadataRepo.findOne({
        where: { key: 'blockOffset' },
      });
      if (blockOffset !== null && blockOffset.value !== null) {
        this.setBlockOffset(Number(blockOffset.value));
      }
      await Promise.all([this.poiService.init(this.schema)]);
    }

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

    void this.fetchService.startLoop(startHeight).catch((err) => {
      logger.error(err, 'failed to fetch block');
      // FIXME: retry before exit
      process.exit(1);
    });
    this.filteredDataSources = this.filterDataSources(startHeight);
    this.fetchService.register((block) => this.indexBlock(block));
  }

  private setBlockOffset(offset: number): void {
    this.blockOffset = offset;
    logger.info(`set blockoffset to ${offset}`);
    void this.mmrService
      .syncFileBaseFromPoi(this.schema, this.blockOffset)
      .catch((err) => {
        logger.error(err, 'failed to sync poi to mmr');
        process.exit(1);
      });
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

    const { chainId } = this.apiService.networkMeta;

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
    if (keyValue.chain !== chainId) {
      await metadataRepo.upsert({ key: 'chain', value: chainId });
    }

    if (keyValue.indexerNodeVersion !== packageVersion) {
      await metadataRepo.upsert({
        key: 'indexerNodeVersion',
        value: packageVersion,
      });
    }

    return metadataRepo;
  }

  private filterDataSources(processedHeight: number): SubqlProjectDs[] {
    let filteredDs = this.project.dataSources;
    if (filteredDs.length === 0) {
      logger.error(`Did not find any dataSource`);
      process.exit(1);
    }
    filteredDs = filteredDs.filter((ds) => ds.startBlock <= processedHeight);
    if (filteredDs.length === 0) {
      logger.error(
        `Your start block is greater than the current indexed block height in your database. Either change your startBlock (project.yaml) to <= ${processedHeight} 
         or delete your database and start again from the currently specified startBlock`,
      );
      process.exit(1);
    }
    // perform filter for custom ds
    filteredDs = filteredDs.filter((ds) => {
      if (isCustomCosmosDs(ds)) {
        return this.dsProcessorService
          .getDsProcessor(ds)
          .dsFilterProcessor(ds, this.api.StargateClient);
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

  private async indexBlockData(
    { block, events, messages, transactions }: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    await this.indexBlockContent(block, dataSources, getVM);

    for (const tx of transactions) {
      await this.indexTransaction(tx, dataSources, getVM);
    }

    for (const msg of messages) {
      await this.indexMessage(msg, dataSources, getVM);
    }

    for (const evt of events) {
      await this.indexEvent(evt, dataSources, getVM);
    }
  }

  private async indexBlockContent(
    block: CosmosBlock,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubqlCosmosHandlerKind.Block, block, ds, getVM(ds));
    }
  }

  private async indexTransaction(
    transaction: CosmosTransaction,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(
        SubqlCosmosHandlerKind.Transaction,
        transaction,
        ds,
        getVM(ds),
      );
    }
  }

  private async indexMessage(
    message: CosmosMessage,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(
        SubqlCosmosHandlerKind.Message,
        message,
        ds,
        getVM(ds),
      );
    }
  }

  private async indexEvent(
    event: CosmosEvent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubqlCosmosHandlerKind.Event, event, ds, getVM(ds));
    }
  }

  private async indexData<K extends SubqlCosmosHandlerKind>(
    kind: K,
    data: CosmosRuntimeHandlerInputMap[K],
    ds: SubqlProjectDs,
    vm: IndexerSandbox,
  ): Promise<void> {
    if (isRuntimeCosmosDs(ds)) {
      const handlers = ds.mapping.handlers.filter(
        (h) => h.kind === kind && FilterTypeMap[kind](data as any, h.filter),
      );

      for (const handler of handlers) {
        await vm.securedExec(handler.handler, [data]);
      }
    } else if (isCustomCosmosDs(ds)) {
      const handlers = this.filterCustomDsHandlers<K>(
        ds,
        data,
        ProcessorTypeMap[kind],
        (data, baseFilter) => {
          switch (kind) {
            case SubqlCosmosHandlerKind.Message:
              return !!CosmosUtil.filterMessages(
                [data as CosmosMessage],
                baseFilter,
              ).length;
            case SubqlCosmosHandlerKind.Event:
              return !!CosmosUtil.filterEvents(
                [data as CosmosEvent],
                baseFilter,
              ).length;
            default:
              throw new Error('Unsuported handler kind');
          }
        },
      );

      for (const handler of handlers) {
        await this.transformAndExecuteCustomDs(ds, vm, handler, data);
      }
    }
  }

  private filterCustomDsHandlers<K extends SubqlCosmosHandlerKind>(
    ds: SubqlCosmosCustomDataSource<string>,
    data: CosmosRuntimeHandlerInputMap[K],
    baseHandlerCheck: ProcessorTypeMap[K],
    baseFilter: (
      data: CosmosRuntimeHandlerInputMap[K],
      baseFilter: any,
    ) => boolean,
  ): SubqlCosmosCustomHandler[] {
    const plugin = this.dsProcessorService.getDsProcessor(ds);

    return ds.mapping.handlers.filter((handler) => {
      const processor = plugin.handlerProcessors[handler.kind];
      if (baseHandlerCheck(processor)) {
        processor.baseFilter;
        return baseFilter(data, processor.baseFilter);
      }
      return false;
    });
  }

  private async transformAndExecuteCustomDs<K extends SubqlCosmosHandlerKind>(
    ds: SubqlCosmosCustomDataSource<string>,
    vm: IndexerSandbox,
    handler: SubqlCosmosCustomHandler,
    data: CosmosRuntimeHandlerInputMap[K],
  ): Promise<void> {
    const plugin = this.dsProcessorService.getDsProcessor(ds);
    const assets = await this.dsProcessorService.getAssets(ds);

    const processor = asSecondLayerHandlerProcessor_1_0_0(
      plugin.handlerProcessors[handler.kind],
    );

    const transformedData = await processor
      .transformer({
        input: data,
        ds,
        api: this.api.StargateClient,
        assets,
      })
      .catch((e) => {
        logger.error(e, 'Failed to transform data with ds processor.');
        throw e;
      });

    await Promise.all(
      transformedData.map((data) => vm.securedExec(handler.handler, [data])),
    );
  }
}

type ProcessorTypeMap = {
  [SubqlCosmosHandlerKind.Block]: typeof isBlockHandlerProcessor;
  [SubqlCosmosHandlerKind.Event]: typeof isEventHandlerProcessor;
  [SubqlCosmosHandlerKind.Transaction]: typeof isTransactionHandlerProcessor;
  [SubqlCosmosHandlerKind.Message]: typeof isMessageHandlerProcessor;
};

const ProcessorTypeMap = {
  [SubqlCosmosHandlerKind.Block]: isBlockHandlerProcessor,
  [SubqlCosmosHandlerKind.Event]: isEventHandlerProcessor,
  [SubqlCosmosHandlerKind.Transaction]: isTransactionHandlerProcessor,
  [SubqlCosmosHandlerKind.Message]: isMessageHandlerProcessor,
};

const FilterTypeMap = {
  [SubqlCosmosHandlerKind.Block]: () => true,
  [SubqlCosmosHandlerKind.Transaction]: () => true,
  [SubqlCosmosHandlerKind.Event]: CosmosUtil.filterEvent,
  [SubqlCosmosHandlerKind.Message]: CosmosUtil.filterMessageData,
};
