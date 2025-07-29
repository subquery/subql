// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Inject, Injectable} from '@nestjs/common';
import {IProjectNetworkConfig} from '@subql/types-core';
import {
  GraphQLModelsRelationsEnums,
  hashName,
  METADATA_REGEX,
  MULTI_METADATA_REGEX,
  hexToU8a,
  GraphQLModelsType,
} from '@subql/utils';
import {
  IndexesOptions,
  ModelAttributes,
  ModelStatic,
  Op,
  QueryTypes,
  Sequelize,
  Transaction,
  Deferrable,
} from '@subql/x-sequelize';
import {camelCase, flatten, last, upperFirst} from 'lodash';
import {NodeConfig} from '../configure';
import {
  BTREE_GIST_EXTENSION_EXIST_QUERY,
  createSchemaTrigger,
  createSchemaTriggerFunction,
  getDbSizeAndUpdateMetadata,
  getTriggers,
  ModifiedDbModels,
  SchemaMigrationService,
  tableExistsQuery,
} from '../db';
import {getLogger} from '../logger';
import {exitWithError} from '../process';
import {customCamelCaseGraphqlKey, getHistoricalUnit} from '../utils';
import {
  GlobalDataFactory,
  GlobalDataRepo,
  MetadataFactory,
  MetadataRepo,
  PoiFactory,
  PoiFactoryDeprecate,
  PoiRepo,
} from './entities';
import {Store} from './store';
import {IMetadata, IStoreModelProvider, PlainStoreModelService} from './storeModelProvider';
import {StoreOperations} from './StoreOperations';
import {Header, HistoricalMode, ISubqueryProject} from './types';

const logger = getLogger('StoreService');
const NULL_MERKEL_ROOT = hexToU8a('0x00');
const DB_SIZE_CACHE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

class NoInitError extends Error {
  constructor() {
    super('StoreService has not been initialized');
  }
}

@Injectable()
export class StoreService {
  poiRepo?: PoiRepo;
  private _modelsRelations?: GraphQLModelsRelationsEnums;
  private _globalDataRepo?: GlobalDataRepo;
  private _metaDataRepo?: MetadataRepo;
  private _historical?: HistoricalMode;
  private _metadataModel?: IMetadata;
  private _schema?: string;
  private _isMultichain?: boolean;
  // Should be updated each block
  private _blockHeader?: Header;
  private _operationStack?: StoreOperations;
  private _lastTimeDbSizeChecked?: number;

  #transaction?: Transaction;

  constructor(
    private sequelize: Sequelize,
    private config: NodeConfig,
    @Inject('IStoreModelProvider') readonly modelProvider: IStoreModelProvider,
    @Inject('ISubqueryProject') private subqueryProject: ISubqueryProject<IProjectNetworkConfig>
  ) {}

  private get modelsRelations(): GraphQLModelsRelationsEnums {
    assert(this._modelsRelations, new NoInitError());
    return this._modelsRelations;
  }

  private get metaDataRepo(): MetadataRepo {
    assert(this._metaDataRepo, new NoInitError());
    return this._metaDataRepo;
  }

  private set operationStack(os: StoreOperations | undefined) {
    this._operationStack = os;
  }

  get operationStack(): StoreOperations | undefined {
    return this._operationStack;
  }

  get globalDataRepo(): GlobalDataRepo {
    assert(this._globalDataRepo, new NoInitError());
    return this._globalDataRepo;
  }

  get blockHeader(): Header {
    assert(this._blockHeader, new Error('StoreService.setBlockHeader has not been called'));
    return this._blockHeader;
  }

  get historical(): HistoricalMode {
    assert(this._historical !== undefined, new NoInitError());
    return this._historical;
  }

  get transaction(): Transaction | undefined {
    return this.#transaction;
  }

  get isMultichain(): boolean {
    assert(this._isMultichain !== undefined, new NoInitError());
    return this._isMultichain;
  }

  async syncDbSize(): Promise<bigint> {
    if (!this._lastTimeDbSizeChecked || Date.now() - this._lastTimeDbSizeChecked > DB_SIZE_CACHE_TIMEOUT) {
      this._lastTimeDbSizeChecked = Date.now();
      return getDbSizeAndUpdateMetadata(this.sequelize, this.schema);
    } else {
      return this.modelProvider.metadata.find('dbSize').then((cachedDbSize) => {
        if (cachedDbSize !== undefined) {
          return cachedDbSize;
        } else {
          this._lastTimeDbSizeChecked = Date.now();
          return getDbSizeAndUpdateMetadata(this.sequelize, this.schema);
        }
      });
    }
  }

  private get metadataModel(): IMetadata {
    assert(this._metadataModel, new NoInitError());
    return this._metadataModel;
  }

  private get schema(): string {
    assert(this._schema, new NoInitError());
    return this._schema;
  }

  // Initialize tables and data that isnt' specific to the users data
  async initCoreTables(schema: string): Promise<void> {
    if (this.config.proofOfIndex) {
      const usePoiFactory = (await this.useDeprecatePoi(schema)) ? PoiFactoryDeprecate : PoiFactory;
      this.poiRepo = usePoiFactory(this.sequelize, schema);
    }

    this._schema = schema;

    await this.setMultiChainProject();

    this._metaDataRepo = await MetadataFactory(
      this.sequelize,
      schema,
      this.isMultichain,
      this.subqueryProject.network.chainId
    );

    if (this.isMultichain) {
      this._globalDataRepo = GlobalDataFactory(this.sequelize, schema);
    }

    await this.sequelize.sync();

    this._historical = await this.getHistoricalStateEnabled(schema);
    logger.info(`Historical state is ${this.historical || 'disabled'}`);

    this.modelProvider.init(this.historical, this.metaDataRepo, this.poiRepo);

    this._metadataModel = this.modelProvider.metadata;

    await this.initHotSchemaReloadQueries(schema);

    await this.metadataModel.set('historicalStateEnabled', this.historical);
  }

  async init(schema: string, tx: Transaction): Promise<void> {
    try {
      if (this.historical) {
        const [results] = await this.sequelize.query(BTREE_GIST_EXTENSION_EXIST_QUERY);
        if (results.length === 0) {
          throw new Error('Btree_gist extension is required to enable historical data, contact DB admin for support');
        }
      }
      /*
      On SyncSchema, if no schema migration is introduced, it would consider current schema to be null, and go all db operations again
      every start up is a migration
       */
      const schemaMigrationService = new SchemaMigrationService(this.sequelize, this, schema, this.config);

      await schemaMigrationService.run(null, this.subqueryProject.schema, tx);

      const deploymentsRaw = await this.metadataModel.find('deployments');
      const deployments = deploymentsRaw ? JSON.parse(deploymentsRaw) : {};

      // Check if the deployment change or a local project is running
      // WARNING:This assumes that the root is the same as the id for local project, there are no checks for this and it could change at any time
      if (
        this.subqueryProject.id === this.subqueryProject.root ||
        last(Object.values(deployments)) !== this.subqueryProject.id
      ) {
        await this.metadataModel.setIncrement('schemaMigrationCount', undefined, tx);
      }
    } catch (e: any) {
      exitWithError(new Error(`Having a problem when syncing schema`, {cause: e}), logger);
    }
  }

  private async initHotSchemaReloadQueries(schema: string): Promise<void> {
    /* These SQL queries are to allow hot-schema reload on query service */
    const schemaTriggerName = hashName(schema, 'schema_trigger', this.metaDataRepo.tableName);
    const schemaTriggers = await getTriggers(this.sequelize, schemaTriggerName);

    try {
      // TODO
      // For now, due to existing channel name over long issue, we will force replace function first
      // We will change this to check with function length in future
      // const schemaFunctions = await getFunctions(this.sequelize,schema,'schema_notification');
      await this.sequelize.query(`${createSchemaTriggerFunction(schema)}`);

      if (schemaTriggers.length === 0) {
        await this.sequelize.query(createSchemaTrigger(schema, this.metaDataRepo.tableName));
      }
    } catch (e) {
      logger.error(`Failed to init Hot schema reload`);
    }
  }

  // Updates the state of the store and model provider after migrations occurr
  updateModels(modelChanges: ModifiedDbModels, modelsRelations: GraphQLModelsRelationsEnums): undefined {
    this.modelProvider.updateModels(modelChanges);
    this._modelsRelations = modelsRelations;
  }

  defineModel(
    model: GraphQLModelsType,
    attributes: ModelAttributes<any>,
    indexes: IndexesOptions[],
    schema: string
  ): ModelStatic<any> {
    const sequelizeModel = this.sequelize.define(model.name, attributes, {
      underscored: true,
      comment: model.description,
      freezeTableName: false,
      timestamps: false,
      schema,
      indexes,
    });

    if (this.historical) {
      // WARNING these hooks depend on `this.blockHeight` which is a changing value. DO NOT move this into a function outside of this class
      sequelizeModel.addScope('defaultScope', {
        attributes: {
          exclude: ['__id', '__block_range'],
        },
      });

      sequelizeModel.addHook('beforeFind', (options) => {
        (options.where as any).__block_range = {
          [Op.contains]: this.getHistoricalUnit(),
        };
      });
      sequelizeModel.addHook('beforeValidate', (attributes, options) => {
        attributes.__block_range = [this.getHistoricalUnit(), null];
      });

      if (!this.config.enableCache) {
        sequelizeModel.addHook('beforeBulkCreate', (instances, options) => {
          instances.forEach((item) => {
            item.__block_range = [this.getHistoricalUnit(), null];
          });
        });
      }
      // TODO, remove id and block_range constraint, check id manually
      // see https://github.com/subquery/subql/issues/1542
    }

    return sequelizeModel;
  }

  private async useDeprecatePoi(schema: string): Promise<boolean> {
    const sql = `SELECT * FROM information_schema.columns WHERE table_schema = ? AND table_name = '_poi' AND column_name = 'projectId'`;
    const [result] = await this.sequelize.query(sql, {replacements: [schema]});
    return !!result.length;
  }

  async getHistoricalStateEnabled(schema: string): Promise<HistoricalMode> {
    const {historical, multiChain} = this.config;

    try {
      const tableRes = await this.sequelize.query<Array<string>>(tableExistsQuery(schema), {type: QueryTypes.SELECT});

      const metadataTableNames = flatten(tableRes).filter(
        (value: string) => METADATA_REGEX.test(value) || MULTI_METADATA_REGEX.test(value)
      );

      if (metadataTableNames.length <= 0) {
        throw new Error('Metadata table does not exist');
      }

      const res = await this.sequelize.query<{key: string; value: boolean | string}>(
        `SELECT key, value FROM "${schema}"."${metadataTableNames[0]}" WHERE (key = 'historicalStateEnabled')`,
        {type: QueryTypes.SELECT}
      );

      if (res[0]?.key !== 'historicalStateEnabled') {
        throw new Error('Metadata table does not have historicalStateEnabled key');
      }

      const value = res[0].value;

      if (typeof value === 'string') {
        if (value === 'height' || value === 'timestamp') {
          return value;
        }
        throw new Error(`Invalid value for historicalStateEnabled. Received "${value}"`);
      }

      if ((value === true || value.toString() === 'height') && multiChain) {
        throw new Error(
          'Historical indexing by height is enabled and not compatible with multi-chain, to multi-chain index clear postgres schema and re-index project using --multichain'
        );
      }

      // TODO parse through CLI/Project option and consider multichain
      return value ? 'height' : false;
    } catch (e) {
      if (multiChain && historical === 'height') {
        logger.warn('Historical state by height is not compatible with multi chain indexing, using timestamp instead.');
        return 'timestamp';
      }
      // Will trigger on first startup as metadata table doesn't exist
      // Default fallback to "height" for backwards compatible
      return historical;
    }
  }

  async setBlockHeader(header: Header): Promise<void> {
    this._blockHeader = header;

    if (this.modelProvider instanceof PlainStoreModelService) {
      assert(!this.#transaction, new Error(`Transaction already exists for height: ${header.blockHeight}`));

      this.#transaction = await this.sequelize.transaction({
        deferrable: this._historical ? undefined : Deferrable.SET_DEFERRED(),
      });
      this.#transaction.afterCommit(() => (this.#transaction = undefined));
    }
    if (this.config.proofOfIndex) {
      this.operationStack = new StoreOperations(this.modelsRelations.models);
    }
  }

  getOperationMerkleRoot(): Uint8Array {
    if (this.config.proofOfIndex) {
      assert(this.operationStack, new Error('OperationStack is not set, make sure `setBlockHeight` has been called'));
      this.operationStack.makeOperationMerkleTree();
      const merkelRoot = this.operationStack.getOperationMerkleRoot();
      if (merkelRoot === null) {
        return NULL_MERKEL_ROOT;
      }
      return merkelRoot;
    }
    return NULL_MERKEL_ROOT;
  }

  /**
   * rollback db that is newer than ${targetBlockHeight} (exclusive)
   * set metadata
   * since transaction is handled outside, metadata cache flushing and tx is done there.
   * @param targetBlockHeight
   * @param transaction
   */
  async rewind(targetBlockHeader: Header, transaction: Transaction): Promise<void> {
    if (!this.historical) {
      throw new Error('Unable to reindex, historical state not enabled');
    }
    // This should only been called from CLI, blockHeight in storeService never been set and is required for`beforeFind` hook
    // Height no need to change for rewind during indexing
    if (this._blockHeader === undefined) {
      await this.setBlockHeader(targetBlockHeader);
    }
    for (const model of Object.values(this.sequelize.models)) {
      if ('__block_range' in model.getAttributes()) {
        await batchDeleteAndThenUpdate(
          this.sequelize,
          model,
          transaction,
          getHistoricalUnit(this.historical, targetBlockHeader)
        );
      }
    }

    await this.metadataModel.set('lastProcessedHeight', targetBlockHeader.blockHeight, transaction);
    if (targetBlockHeader.timestamp) {
      await this.metadataModel.set('lastProcessedBlockTimestamp', targetBlockHeader.timestamp.getTime(), transaction);
    }
    // metadataModel will be flushed in reindex.ts#reindex()
  }

  isIndexed(entity: string, field: string): boolean {
    const indexes = this.modelProvider.getModel(entity).model.options.indexes ?? [];

    return (
      indexes.findIndex((idx) => {
        const matchingField = idx.fields?.find((f) => {
          const fieldName = (f as any).name ?? f;
          return camelCase(fieldName) === customCamelCaseGraphqlKey(field);
        });
        return !!matchingField;
      }) > -1
    );
  }

  isIndexedHistorical(entity: string, field: string): boolean {
    const indexes = this.modelProvider.getModel(entity).model.options.indexes ?? [];

    return (
      indexes.findIndex((idx) => {
        const matchingField = idx.fields?.find((f) => {
          const fieldName = (f as any).name ?? f;
          return camelCase(fieldName) === customCamelCaseGraphqlKey(field);
        });
        // With historical indexes are not unique
        return !!matchingField && (this.historical || idx.unique);
      }) > -1
    );
  }

  getStore(): Store {
    return new Store(this.config, this.modelProvider, this);
  }

  // Get the right unit depending on the historical mode
  getHistoricalUnit(): number {
    // Cant throw here because even with historical disabled the current height is used by the store
    return getHistoricalUnit(this.historical, this.blockHeader);
  }

  async getLastProcessedBlock(): Promise<{height: number; timestamp?: number}> {
    const {lastProcessedBlockTimestamp: timestamp, lastProcessedHeight: height} = await this.metadataModel.findMany([
      'lastProcessedHeight',
      'lastProcessedBlockTimestamp',
    ]);

    return {height: height || 0, timestamp};
  }

  private async setMultiChainProject() {
    if (this.config.multiChain) {
      this._isMultichain = true;
      return;
    }

    const tableRes = await this.sequelize.query<Array<string>>(tableExistsQuery(this.schema), {
      type: QueryTypes.SELECT,
    });

    this._isMultichain = !!flatten(tableRes).find((value: string) => MULTI_METADATA_REGEX.test(value));
  }
}

// REMOVE 10,000 record per batch
async function batchDeleteAndThenUpdate(
  sequelize: Sequelize,
  model: ModelStatic<any>,
  transaction: Transaction,
  targetBlockUnit: number, // Height or timestamp
  batchSize = 10000
): Promise<void> {
  let destroyCompleted = false;
  let updateCompleted = false;
  while (!destroyCompleted || !updateCompleted) {
    try {
      const [numDestroyRows, [numUpdatedRows]] = await Promise.all([
        destroyCompleted
          ? 0
          : model.destroy({
              transaction,
              hooks: false,
              limit: batchSize,
              where: sequelize.where(sequelize.fn('lower', sequelize.col('_block_range')), Op.gt, targetBlockUnit),
            }),
        updateCompleted
          ? [0]
          : model.update(
              {
                __block_range: sequelize.fn('int8range', sequelize.fn('lower', sequelize.col('_block_range')), null),
              },
              {
                transaction,
                limit: batchSize,
                hooks: false,
                where: {
                  [Op.and]: [
                    {
                      __block_range: {
                        [Op.contains]: targetBlockUnit,
                      },
                    },
                    sequelize.where(sequelize.fn('upper', sequelize.col('_block_range')), Op.not, null),
                  ],
                },
              }
            ),
      ]);
      logger.debug(`${model.name} deleted ${numDestroyRows} records, updated ${numUpdatedRows} records`);
      if (numDestroyRows === 0) {
        destroyCompleted = true;
      }
      if (numUpdatedRows === 0) {
        updateCompleted = true;
      }
    } catch (e) {
      throw new Error(`Reindex update model ${model.name} failed, please try to reindex again: ${e}`);
    }
  }
}
