// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import fs from 'fs';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { hexToU8a, u8aEq } from '@polkadot/util';
import {
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
  SubqlHandlerKind,
  SubqlNetworkFilter,
  SubqlRuntimeHandler,
} from '@subql/types';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { SubqueryRepo } from '../entities';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import * as SubstrateUtil from '../utils/substrate';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { SubstrateApi } from './api.substrate';
import { ApiWrapper } from './api.wrapper';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { MetadataFactory, MetadataRepo } from './entities/Metadata.entity';
import { IndexerEvent } from './events';
import { FetchService } from './fetch.service';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { PoiBlock } from './PoiBlock';
import { IndexerSandbox, SandboxService } from './sandbox.service';
import { StoreService } from './store.service';
import { ApiAt, BlockContent } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';
const NULL_MERKEL_ROOT = hexToU8a('0x00');

const logger = getLogger('indexer');
const { argv } = getYargsOption();

@Injectable()
export class IndexerManager {
  private api: ApiWrapper;
  private prevSpecVersion?: number;
  protected metadataRepo: MetadataRepo;
  private filteredDataSources: SubqlProjectDs[];

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

  async indexBlockForDs(
    ds: SubqlProjectDs,
    blockContent: BlockContent,
    apiAt: ApiAt,
    blockHeight: number,
    tx: Transaction,
  ): Promise<void> {
    const vm = this.sandboxService.getDsProcessor(ds, apiAt);

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

    if (isRuntimeDs(ds)) {
      await this.indexBlockForRuntimeDs(vm, ds.mapping.handlers, blockContent);
    } else if (isCustomDs(ds)) {
      await this.indexBlockForCustomDs(ds, vm, blockContent);
    }

    // TODO should we remove createDynamicDatasource from vm here?
  }

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
        block.block.header.number.unwrap().toNumber(),
        isUpgraded ? block.block.header.parentHash : undefined,
      );

      // Run predefined data sources
      for (const ds of this.filteredDataSources) {
        await this.indexBlockForDs(ds, blockContent, apiAt, blockHeight, tx);
      }

      // Run dynamic data sources, must be after predefined datasources
      // FIXME if any new dynamic datasources are created here they wont be run for the current block
      for (const ds of await this.dynamicDsService.getDynamicDatasources()) {
        await this.indexBlockForDs(ds, blockContent, apiAt, blockHeight, tx);
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
        if (!u8aEq(operationHash, NULL_MERKEL_ROOT)) {
          const poiBlock = PoiBlock.create(
            blockHeight,
            block.block.header.hash.toHex(),
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
    this.fetchService.latestProcessed(block.block.header.number.toNumber());
    this.prevSpecVersion = block.specVersion;
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
      'specName',
      'genesisHash',
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

    // blockOffset and genesisHash should only have been created once, never updated.
    // If blockOffset is changed, will require re-index and re-sync poi.
    if (!keyValue.blockOffset) {
      const offsetValue = (this.getStartBlockFromDataSources() - 1).toString();
      await metadataRepo.upsert({ key: 'blockOffset', value: offsetValue });
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
        (this.project.network.genesisHash ?? genesisHash) ===
          keyValue.genesisHash,
        'Specified project manifest genesis hash does not match database stored genesis hash, consider cleaning project schema using --force-clean',
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

  private filterDataSources(processedHeight: number): SubqlProjectDs[] {
    if (this.project.network !== 'polkadot') {
      return null;
    }
    const substrateApi = this.api as SubstrateApi;
    let filteredDs = this.getDataSourcesForSpecName();
    if (filteredDs.length === 0) {
      logger.error(
        `Did not find any dataSource match with network specName ${substrateApi.getSpecName()}`,
      );
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
      if (isCustomDs(ds)) {
        return this.dsProcessorService
          .getDsProcessor(ds)
          .dsFilterProcessor(ds, substrateApi.getClient());
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
        !ds.filter?.specName || ds.filter.specName === this.api.getSpecName(),
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
      if (this.project.network !== 'polkadot') {
        return null;
      }
      const substrateApi = this.api as SubstrateApi;
      const transformedData = await Promise.all(
        filteredData
          .filter((data) => processor.filterProcessor(handler.filter, data, ds))
          .map((data) =>
            processor.transformer(data, ds, substrateApi.getClient(), assets),
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
}
