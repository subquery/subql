// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Inject, Injectable} from '@nestjs/common';
import {getDbType, SUPPORT_DB} from '@subql/common';
import {IProjectNetworkConfig} from '@subql/types-core';
import {
  GraphQLModelsRelationsEnums,
  hashName,
  METADATA_REGEX,
  MULTI_METADATA_REGEX,
  hexToU8a,
  GraphQLModelsType,
} from '@subql/utils';
import {IndexesOptions, ModelAttributes, ModelStatic, Op, QueryTypes, Sequelize, Transaction} from '@subql/x-sequelize';
import {camelCase, flatten, last, upperFirst} from 'lodash';
import {NodeConfig} from '../configure';
import {
  BTREE_GIST_EXTENSION_EXIST_QUERY,
  createSchemaTrigger,
  createSchemaTriggerFunction,
  getDbSizeAndUpdateMetadata,
  getTriggers,
  SchemaMigrationService,
} from '../db';
import {getLogger} from '../logger';
import {exitWithError} from '../process';
import {camelCaseObjectKey} from '../utils';
import {MetadataFactory, MetadataRepo, PoiFactory, PoiFactoryDeprecate, PoiRepo} from './entities';
import {Store} from './store';
import {CacheMetadataModel} from './storeCache';
import {StoreCacheService} from './storeCache/storeCache.service';
import {StoreOperations} from './StoreOperations';
import {ISubqueryProject} from './types';

const logger = getLogger('StoreService');
const NULL_MERKEL_ROOT = hexToU8a('0x00');
const DB_SIZE_CACHE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

interface IndexField {
  entityName: string;
  fieldName: string;
  isUnique: boolean;
  type: string;
}

class NoInitError extends Error {
  constructor() {
    super('StoreService has not been initialized');
  }
}

@Injectable()
export class StoreService {
  poiRepo?: PoiRepo;
  private _modelIndexedFields?: IndexField[];
  private _modelsRelations?: GraphQLModelsRelationsEnums;
  private _metaDataRepo?: MetadataRepo;
  private _historical?: boolean;
  private _dbType?: SUPPORT_DB;
  private _metadataModel?: CacheMetadataModel;
  private _schema?: string;
  // Should be updated each block
  private _blockHeight?: number;
  private _operationStack?: StoreOperations;
  private _lastTimeDbSizeChecked?: number;

  constructor(
    private sequelize: Sequelize,
    private config: NodeConfig,
    readonly storeCache: StoreCacheService,
    @Inject('ISubqueryProject') private subqueryProject: ISubqueryProject<IProjectNetworkConfig>
  ) {}

  private get modelIndexedFields(): IndexField[] {
    assert(this._modelIndexedFields, new NoInitError());
    return this._modelIndexedFields;
  }

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

  get blockHeight(): number {
    assert(this._blockHeight, new Error('StoreService.setBlockHeight has not been called'));
    return this._blockHeight;
  }

  get historical(): boolean {
    assert(this._historical !== undefined, new NoInitError());
    return this._historical;
  }

  async syncDbSize(): Promise<bigint> {
    if (!this._lastTimeDbSizeChecked || Date.now() - this._lastTimeDbSizeChecked > DB_SIZE_CACHE_TIMEOUT) {
      this._lastTimeDbSizeChecked = Date.now();
      return getDbSizeAndUpdateMetadata(this.sequelize, this.schema);
    } else {
      return this.storeCache.metadata.find('dbSize').then((cachedDbSize) => {
        if (cachedDbSize !== undefined) {
          return cachedDbSize;
        } else {
          this._lastTimeDbSizeChecked = Date.now();
          return getDbSizeAndUpdateMetadata(this.sequelize, this.schema);
        }
      });
    }
  }

  private get dbType(): SUPPORT_DB {
    assert(this._dbType, new NoInitError());
    return this._dbType;
  }

  private get metadataModel(): CacheMetadataModel {
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

    this._metaDataRepo = await MetadataFactory(
      this.sequelize,
      schema,
      this.config.multiChain,
      this.subqueryProject.network.chainId
    );

    this._dbType = await getDbType(this.sequelize);
    this._schema = schema;

    await this.sequelize.sync();

    this._historical = await this.getHistoricalStateEnabled(schema);
    if (this.historical && this.dbType === SUPPORT_DB.cockRoach) {
      this._historical = false;
      logger.warn(`Historical feature is not supported with ${this.dbType}`);
    }
    logger.info(`Historical state is ${this.historical ? 'enabled' : 'disabled'}`);

    this.storeCache.init(this.historical, this.dbType === SUPPORT_DB.cockRoach, this.metaDataRepo, this.poiRepo);

    this._metadataModel = this.storeCache.metadata;

    await this.initHotSchemaReloadQueries(schema);

    this.metadataModel.set('historicalStateEnabled', this.historical);
  }

  async init(schema: string): Promise<void> {
    try {
      const tx = await this.sequelize.transaction();
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
      const schemaMigrationService = new SchemaMigrationService(
        this.sequelize,
        this,
        this.storeCache._flushCache.bind(this.storeCache),
        schema,
        this.config
      );

      await schemaMigrationService.run(null, this.subqueryProject.schema, tx);

      const deploymentsRaw = await this.metadataModel.find('deployments');
      const deployments = deploymentsRaw ? JSON.parse(deploymentsRaw) : {};

      // Check if the deployment change or a local project is running
      // WARNING:This assumes that the root is the same as the id for local project, there are no checks for this and it could change at any time
      if (
        this.subqueryProject.id === this.subqueryProject.root ||
        last(Object.values(deployments)) !== this.subqueryProject.id
      ) {
        // TODO this should run with the same db transaction as the migration
        this.metadataModel.setIncrement('schemaMigrationCount');
      }
    } catch (e: any) {
      exitWithError(new Error(`Having a problem when syncing schema`, {cause: e}), logger);
    }
  }

  private async initHotSchemaReloadQueries(schema: string): Promise<void> {
    if (this.dbType === SUPPORT_DB.cockRoach) {
      logger.warn(`Hot schema reload feature is not supported with ${this.dbType}`);
      return;
    }

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

  async updateModels(schema: string, modelsRelations: GraphQLModelsRelationsEnums): Promise<void> {
    this._modelsRelations = modelsRelations;
    try {
      this._modelIndexedFields = await this.getAllIndexFields(schema);
    } catch (e: any) {
      exitWithError(new Error(`Having a problem when getting indexed fields`, {cause: e}), logger);
    }
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
          [Op.contains]: this.blockHeight as any,
        };
      });
      sequelizeModel.addHook('beforeValidate', (attributes, options) => {
        attributes.__block_range = [this.blockHeight, null];
      });
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

  async getHistoricalStateEnabled(schema: string): Promise<boolean> {
    const {disableHistorical, multiChain} = this.config;

    try {
      const tableRes = await this.sequelize.query<Array<string>>(
        `SELECT table_name FROM information_schema.tables where table_schema='${schema}'`,
        {type: QueryTypes.SELECT}
      );

      const metadataTableNames = flatten(tableRes).filter(
        (value: string) => METADATA_REGEX.test(value) || MULTI_METADATA_REGEX.test(value)
      );

      if (metadataTableNames.length > 1 && !multiChain) {
        exitWithError(
          'There are multiple projects in the database schema, if you are trying to multi-chain index use --multi-chain',
          logger
        );
      }

      if (metadataTableNames.length === 1) {
        const res = await this.sequelize.query<{key: string; value: boolean | string}>(
          `SELECT key, value FROM "${schema}"."${metadataTableNames[0]}" WHERE (key = 'historicalStateEnabled' OR key = 'genesisHash')`,
          {type: QueryTypes.SELECT}
        );

        const store = res.reduce(
          function (total, current) {
            total[current.key] = current.value;
            return total;
          },
          {} as {[key: string]: string | boolean}
        );

        const useHistorical =
          store.historicalStateEnabled === undefined ? !disableHistorical : (store.historicalStateEnabled as boolean);

        if (useHistorical && multiChain) {
          throw new Error(
            'Historical feature is enabled and not compatible with multi-chain, to multi-chain index clear postgres schema and re-index project using --multichain'
          );
        }
        return useHistorical;
      }
      throw new Error('Metadata table does not exist');
    } catch (e) {
      if (multiChain && !disableHistorical) {
        logger.info('Historical state is not compatible with multi chain indexing, disabling historical..');
        return false;
      }

      // Will trigger on first startup as metadata table doesn't exist
      return !disableHistorical;
    }
  }
  setBlockHeight(blockHeight: number): void {
    this._blockHeight = blockHeight;
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

  private async getAllIndexFields(schema: string) {
    const fields: IndexField[][] = [];
    for (const entity of this.modelsRelations.models) {
      const model = this.sequelize.model(entity.name);
      const tableFields = await this.packEntityFields(schema, entity.name, model.tableName);
      fields.push(tableFields);
    }
    return flatten(fields);
  }

  private async packEntityFields(schema: string, entity: string, table: string): Promise<IndexField[]> {
    const rows = await this.sequelize.query(
      `select
    '${entity}' as entity_name,
    a.attname as field_name,
    idx.indisunique as is_unique,
    am.amname as type
from
    pg_index idx
    JOIN pg_class cls ON cls.oid=idx.indexrelid
    JOIN pg_class tab ON tab.oid=idx.indrelid
    JOIN pg_am am ON am.oid=cls.relam,
    pg_namespace n,
    pg_attribute a
where
  n.nspname = '${schema}'
  and tab.relname = '${table}'
  and a.attrelid = tab.oid
  and a.attnum = ANY(idx.indkey)
  and not idx.indisprimary
group by
    n.nspname,
    a.attname,
    tab.relname,
    idx.indisunique,
    am.amname`,
      {
        type: QueryTypes.SELECT,
      }
    );
    return rows.map((result) => camelCaseObjectKey(result)) as IndexField[];
  }

  /**
   * rollback db that is newer than ${targetBlockHeight} (exclusive)
   * set metadata
   * since transaction is handled outside, metadata cache flushing and tx is done there.
   * @param targetBlockHeight
   * @param transaction
   */
  async rewind(targetBlockHeight: number, transaction: Transaction): Promise<void> {
    if (!this.historical) {
      throw new Error('Unable to reindex, historical state not enabled');
    }
    // This should only been called from CLI, blockHeight in storeService never been set and is required for`beforeFind` hook
    // Height no need to change for rewind during indexing
    if (this._blockHeight === undefined) {
      this.setBlockHeight(targetBlockHeight);
    }
    for (const model of Object.values(this.sequelize.models)) {
      if ('__block_range' in model.getAttributes()) {
        await batchDeleteAndThenUpdate(this.sequelize, model, transaction, targetBlockHeight);
      }
    }
    this.metadataModel.set('lastProcessedHeight', targetBlockHeight);
    // metadataModel will be flushed in reindex.ts#reindex()
  }

  isIndexed(entity: string, field: string): boolean {
    return (
      this.modelIndexedFields.findIndex(
        (indexField) =>
          (upperFirst(camelCase(indexField.entityName)) === entity || indexField.entityName === entity) &&
          // We add this because in some case upperFirst and camelCase will not match with entity name,
          // see test entity name like `MinerIP`
          camelCase(indexField.fieldName) === camelCase(field)
      ) > -1
    );
  }

  isIndexedHistorical(entity: string, field: string): boolean {
    return (
      this.modelIndexedFields.findIndex(
        (indexField) =>
          upperFirst(camelCase(indexField.entityName)) === entity &&
          camelCase(indexField.fieldName) === camelCase(field) &&
          // With historical indexes are not unique
          (this.historical || indexField.isUnique)
      ) > -1
    );
  }

  getStore(): Store {
    return new Store(this.config, this.storeCache, this);
  }
}

// REMOVE 10,000 record per batch
async function batchDeleteAndThenUpdate(
  sequelize: Sequelize,
  model: ModelStatic<any>,
  transaction: Transaction,
  targetBlockHeight: number,
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
              where: sequelize.where(sequelize.fn('lower', sequelize.col('_block_range')), Op.gt, targetBlockHeight),
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
                        [Op.contains]: targetBlockHeight,
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
