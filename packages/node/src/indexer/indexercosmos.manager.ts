// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { toHex } from '@cosmjs/encoding';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { hexToU8a, u8aEq } from '@polkadot/util';
import {
  isBlockHandlerProcessor,
  isCustomCosmosDs,
  isRuntimeCosmosDs,
  isTransactionHandlerProcessor,
  isEventHandlerProcessor,
  isMessageHandlerProcessor,
} from '@subql/common-cosmos';
import {
  SubqlCosmosCustomDatasource,
  SubqlCosmosHandlerKind,
  SubqlCosmosRuntimeHandler,
  SecondLayerCosmosHandlerProcessor,
  SubqlCosmosCustomHandler,
  CosmosRuntimeHandlerInputMap,
} from '@subql/types-cosmos';
import { getAllEntitiesRelations } from '@subql/utils';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import {
  SubqueryCosmosProject,
  SubqlCosmosProjectDs,
} from '../configure/cosmosproject.model';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryModel, SubqueryRepo } from '../entities';
import { filterMessages, filterEvents } from '../utils/cosmos-helper';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import { getYargsOption } from '../yargs';
import { ApiCosmosService, CosmosClient } from './apicosmos.service';
import { CosmosDsProcessorService } from './cosmosds-processor.service';
import { DynamicDsService } from './cosmosdynamic-ds.service';
import { MetadataFactory, MetadataRepo } from './entities/Metadata.entity';
import { IndexerEvent } from './events';
import { FetchCosmosService } from './fetchcosmos.service';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { PoiBlock } from './PoiBlock';
import { IndexerSandbox, SandboxCosmosService } from './sandboxcosmos.service';
import { StoreService } from './store.service';
import { CosmosBlockContent } from './types';

const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';
const NULL_MERKEL_ROOT = hexToU8a('0x00');

const logger = getLogger('indexer');
const { argv } = getYargsOption();

@Injectable()
export class IndexerCosmosManager {
  private api: CosmosClient;
  private subqueryState: SubqueryModel;
  protected metadataRepo: MetadataRepo;
  private filteredDataSources: SubqlCosmosProjectDs[];

  constructor(
    private storeService: StoreService,
    private apiService: ApiCosmosService,
    private fetchService: FetchCosmosService,
    private poiService: PoiService,
    protected mmrService: MmrService,
    private sequelize: Sequelize,
    private project: SubqueryCosmosProject,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxCosmosService,
    private dsProcessorService: CosmosDsProcessorService,
    private dynamicDsService: DynamicDsService,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    private eventEmitter: EventEmitter2,
  ) {}

  async indexBlockForDs(
    ds: SubqlCosmosProjectDs,
    blockContent: CosmosBlockContent,
    blockHeight: number,
    tx: Transaction,
  ): Promise<void> {
    const vm = this.sandboxService.getDsProcessor(ds, blockHeight);

    // Inject function to create ds into vm
    vm.freeze(
      (templateName: string, args?: Record<string, unknown>) =>
        this.dynamicDsService.createDynamicDatasource(
          {
            templateName,
            args,
            startBlock: blockHeight,
          },
          tx,
        ),
      'createDynamicDatasource',
    );

    if (isRuntimeCosmosDs(ds)) {
      await this.indexBlockForRuntimeDs(vm, ds.mapping.handlers, blockContent);
    } else if (isCustomCosmosDs(ds)) {
      await this.indexBlockForCustomDs(ds, vm, blockContent);
    }

    // TODO should we remove createDynamicDatasource from vm here?
  }

  @profiler(argv.profiler)
  async indexBlock(blockContent: CosmosBlockContent): Promise<void> {
    const { block } = blockContent;
    const blockHeight = +block.block.header.height;
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height: blockHeight,
      timestamp: Date.now(),
    });
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);

    let poiBlockHash: Uint8Array;
    try {
      // Run predefined data sources
      for (const ds of this.filteredDataSources) {
        await this.indexBlockForDs(ds, blockContent, blockHeight, tx);
      }

      // Run dynamic data sources, must be after predefined datasources
      // FIXME if any new dynamic datasources are created here they wont be run for the current block
      for (const ds of await this.dynamicDsService.getDynamicDatasources()) {
        await this.indexBlockForDs(ds, blockContent, blockHeight, tx);
      }

      await this.storeService.setMetadataBatch(
        [
          { key: 'lastProcessedHeight', value: blockHeight },
          { key: 'lastProcessedTimestamp', value: Date.now() },
        ],
        { transaction: tx },
      );
      if (this.nodeConfig.proofOfIndex) {
        const operationHash = this.storeService.getOperationMerkleRoot();
        //check if operation is null, then poi will not be insert
        const blockHash = block.block.id;
        const blockHashBytes = new Uint8Array(
          blockHash.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)),
        );
        if (!u8aEq(operationHash, NULL_MERKEL_ROOT)) {
          const poiBlock = PoiBlock.create(
            blockHeight,
            blockHashBytes,
            operationHash,
            await this.poiService.getLatestPoiBlockHash(),
            this.project.id,
          );
          poiBlockHash = poiBlock.hash;
          await this.storeService.setPoi(poiBlock, { transaction: tx });
        }
      }
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    await tx.commit();
    this.fetchService.latestProcessed(+block.block.header.height);
    if (this.nodeConfig.proofOfIndex) {
      this.poiService.setLatestPoiBlockHash(poiBlockHash);
    }
  }

  async start(): Promise<void> {
    await this.dsProcessorService.validateProjectCustomDatasources();
    await this.fetchService.init();
    this.api = this.apiService.getApi();
    const schema = await this.ensureProject();
    await this.initDbSchema(schema);
    this.metadataRepo = await this.ensureMetadata(schema);
    this.dynamicDsService.init(this.metadataRepo);

    if (this.nodeConfig.proofOfIndex) {
      await Promise.all([
        this.poiService.init(schema),
        this.mmrService.init(schema),
      ]);
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

    if (this.nodeConfig.proofOfIndex) {
      void this.mmrService.syncFileBaseFromPoi().catch((err) => {
        logger.error(err, 'failed to sync poi to mmr');
        process.exit(1);
      });
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

  private async initDbSchema(schema: string): Promise<void> {
    const graphqlSchema = this.project.schema;
    const modelsRelations = getAllEntitiesRelations(graphqlSchema);
    await this.storeService.init(modelsRelations, schema);
  }

  private async ensureMetadata(schema: string): Promise<MetadataRepo> {
    const metadataRepo = MetadataFactory(this.sequelize, schema);

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

    const { chain } = this.apiService.networkMeta;

    // blockOffset and genesisHash should only have been created once, never updated.
    // If blockOffset is changed, will require re-index and re-sync poi.
    if (!keyValue.blockOffset) {
      const offsetValue = (this.getStartBlockFromDataSources() - 1).toString();
      await metadataRepo.upsert({ key: 'blockOffset', value: offsetValue });
    }

    if (keyValue.chain !== chain) {
      await metadataRepo.upsert({ key: 'chain', value: chain });
    }

    if (keyValue.indexerNodeVersion !== packageVersion) {
      await metadataRepo.upsert({
        key: 'indexerNodeVersion',
        value: packageVersion,
      });
    }

    return metadataRepo;
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

  private filterDataSources(processedHeight: number): SubqlCosmosProjectDs[] {
    const ds = this.project.dataSources;
    if (ds.length === 0) {
      logger.error(`Did not find any datasource`);
      process.exit(1);
    }
    let filteredDs = ds.filter((ds) => ds.startBlock <= processedHeight);
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

  private async indexBlockForRuntimeDs(
    vm: IndexerSandbox,
    handlers: SubqlCosmosRuntimeHandler[],
    { block, events, messages, transactions }: CosmosBlockContent,
  ): Promise<void> {
    for (const handler of handlers) {
      switch (handler.kind) {
        case SubqlCosmosHandlerKind.Block:
          await vm.securedExec(handler.handler, [block]);
          break;
        case SubqlCosmosHandlerKind.Transaction: {
          for (const transaction of transactions) {
            await vm.securedExec(handler.handler, [transaction]);
          }
          break;
        }
        case SubqlCosmosHandlerKind.Message: {
          const filteredMessages = filterMessages(messages, handler.filter);
          for (const message of filteredMessages) {
            await vm.securedExec(handler.handler, [message]);
          }
          break;
        }
        case SubqlCosmosHandlerKind.Event: {
          const filteredEvents = filterEvents(events, handler.filter);
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
    ds: SubqlCosmosCustomDatasource<string>,
    vm: IndexerSandbox,
    { block, events, messages, transactions }: CosmosBlockContent,
  ): Promise<void> {
    const plugin = this.dsProcessorService.getDsProcessor(ds);
    const assets = await this.dsProcessorService.getAssets(ds);
    const processData = async <K extends SubqlCosmosHandlerKind>(
      processor: SecondLayerCosmosHandlerProcessor<K, unknown, unknown>,
      handler: SubqlCosmosCustomHandler<string>,
      filteredData: CosmosRuntimeHandlerInputMap[K][],
    ): Promise<void> => {
      const transformedData = await Promise.all(
        filteredData
          .filter((data) => processor.filterProcessor(handler.filter, data, ds))
          .map((data) =>
            processor.transformer(data, ds, this.api.StargateClient, assets),
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
      } else if (isTransactionHandlerProcessor(processor)) {
        for (const tx of transactions) {
          await processData(processor, handler, [tx]);
        }
      } else if (isMessageHandlerProcessor(processor)) {
        const filteredMessages = filterMessages(messages, processor.baseFilter);
        for (const message of filteredMessages) {
          await processData(processor, handler, [message]);
        }
      } else if (isEventHandlerProcessor(processor)) {
        const filteredEvents = filterEvents(events, processor.baseFilter);
        for (const e of filteredEvents) {
          await processData(processor, handler, [e]);
        }
      }
    }
  }
}
