// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Inject, Injectable} from '@nestjs/common';
import {hexToU8a} from '@polkadot/util';
import {blake2AsHex} from '@polkadot/util-crypto';
import {getDbType, SUPPORT_DB} from '@subql/common';

import {Entity, Store} from '@subql/types';
import {
  GraphQLModelsRelationsEnums,
  GraphQLModelsType,
  GraphQLRelationsType,
  hashName,
  IndexType,
  METADATA_REGEX,
  MULTI_METADATA_REGEX,
} from '@subql/utils';
import {camelCase, flatten, isEqual, upperFirst} from 'lodash';
import {
  DataTypes,
  IndexesOptions,
  Model,
  ModelAttributeColumnOptions,
  ModelAttributes,
  ModelStatic,
  Op,
  QueryTypes,
  Sequelize,
  Transaction,
  Utils,
} from 'sequelize';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {
  addTagsToForeignKeyMap,
  BTREE_GIST_EXTENSION_EXIST_QUERY,
  camelCaseObjectKey,
  commentConstraintQuery,
  commentTableQuery,
  createNotifyTrigger,
  createSchemaTrigger,
  createSchemaTriggerFunction,
  createSendNotificationTriggerFunction,
  createUniqueIndexQuery,
  dropNotifyFunction,
  dropNotifyTrigger,
  enumNameToHash,
  getFkConstraint,
  getTriggers,
  getVirtualFkTag,
  modelsTypeToModelAttributes,
  SmartTags,
  smartTags,
  getEnumDeprecated,
  constraintDeferrableQuery,
} from '../utils';
import {MetadataFactory, MetadataRepo, PoiFactory, PoiRepo} from './entities';
import {CacheMetadataModel} from './storeCache';
import {CachePoiModel} from './storeCache/cachePoi';
import {StoreCacheService} from './storeCache/storeCache.service';
import {StoreOperations} from './StoreOperations';
import {IProjectNetworkConfig, ISubqueryProject, OperationType} from './types';

const logger = getLogger('store');
const NULL_MERKEL_ROOT = hexToU8a('0x00');
const NotifyTriggerManipulationType = [`INSERT`, `DELETE`, `UPDATE`];

interface IndexField {
  entityName: string;
  fieldName: string;
  isUnique: boolean;
  type: string;
}

interface NotifyTriggerPayload {
  triggerName: string;
  eventManipulation: string;
}

@Injectable()
export class StoreService {
  private modelIndexedFields: IndexField[];
  private schema: string;
  private modelsRelations: GraphQLModelsRelationsEnums;
  private poiRepo: PoiRepo | undefined;
  private metaDataRepo: MetadataRepo;
  private operationStack: StoreOperations;
  @Inject('ISubqueryProject') private subqueryProject: ISubqueryProject<IProjectNetworkConfig>;
  private blockHeight: number;
  historical: boolean;
  private dbType: SUPPORT_DB;
  private useSubscription: boolean;

  poiModel: CachePoiModel;
  metadataModel: CacheMetadataModel;

  constructor(private sequelize: Sequelize, private config: NodeConfig, readonly storeCache: StoreCacheService) {}

  async init(modelsRelations: GraphQLModelsRelationsEnums, schema: string): Promise<void> {
    this.schema = schema;
    this.modelsRelations = modelsRelations;
    this.historical = await this.getHistoricalStateEnabled();
    logger.info(`Historical state is ${this.historical ? 'enabled' : 'disabled'}`);
    this.dbType = await getDbType(this.sequelize);

    this.useSubscription = this.config.subscription;
    if (this.useSubscription && this.dbType === SUPPORT_DB.cockRoach) {
      this.useSubscription = false;
      logger.warn(`Subscription is not support with ${this.dbType}`);
    }
    if (this.historical && this.dbType === SUPPORT_DB.cockRoach) {
      this.historical = false;
      logger.warn(`Historical feature is not support with ${this.dbType}`);
    }
    this.storeCache.setHistorical(this.historical);

    try {
      await this.syncSchema(this.schema);
    } catch (e) {
      logger.error(e, `Having a problem when syncing schema`);
      process.exit(1);
    }
    try {
      this.modelIndexedFields = await this.getAllIndexFields(this.schema);
    } catch (e) {
      logger.error(e, `Having a problem when get indexed fields`);
      process.exit(1);
    }

    this.storeCache.setRepos(this.metaDataRepo, this.poiRepo);
    this.metadataModel = this.storeCache.metadata;
    this.poiModel = this.storeCache.poi;

    this.metadataModel.set('historicalStateEnabled', this.historical);
    this.metadataModel.setIncrement('schemaMigrationCount');
  }

  async initHotSchemaReloadQueries(schema: string): Promise<void> {
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

  // eslint-disable-next-line complexity
  async syncSchema(schema: string): Promise<void> {
    const enumTypeMap = new Map<string, string>();
    if (this.historical) {
      const [results] = await this.sequelize.query(BTREE_GIST_EXTENSION_EXIST_QUERY);
      if (results.length === 0) {
        throw new Error('Btree_gist extension is required to enable historical data, contact DB admin for support');
      }
    }

    for (const e of this.modelsRelations.enums) {
      // We shouldn't set the typename to e.name because it could potentially create SQL injection,
      // using a replacement at the type name location doesn't work.
      const enumTypeName = enumNameToHash(e.name);
      let type = `"${schema}"."${enumTypeName}"`;
      let [results] = await this.sequelize.query(
        `SELECT pg_enum.enumlabel as enum_value
         FROM pg_type t JOIN pg_enum ON pg_enum.enumtypid = t.oid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
         WHERE t.typname = ? AND n.nspname = ? order by enumsortorder;`,
        {replacements: [enumTypeName, schema]}
      );

      const enumTypeNameDeprecated = `${schema}_enum_${enumNameToHash(e.name)}`;
      const resultsDeprecated = await getEnumDeprecated(this.sequelize, enumTypeNameDeprecated);
      if (resultsDeprecated.length !== 0) {
        results = resultsDeprecated;
        type = `"${enumTypeNameDeprecated}"`;
      }

      if (results.length === 0) {
        await this.sequelize.query(`CREATE TYPE ${type} as ENUM (${e.values.map(() => '?').join(',')});`, {
          replacements: e.values,
        });
      } else {
        const currentValues = results.map((v: any) => v.enum_value);
        // Assert the existing enum is same

        // Make it a function to not execute potentially big joins unless needed
        if (!isEqual(e.values, currentValues)) {
          throw new Error(
            `\n * Can't modify enum "${e.name}" between runs: \n * Before: [${currentValues.join(
              `,`
            )}] \n * After : [${e.values.join(',')}] \n * You must rerun the project to do such a change`
          );
        }
      }
      // Ref: https://www.graphile.org/postgraphile/enums/
      // Example query for enum name: COMMENT ON TYPE "polkadot-starter_enum_a40fe73329" IS E'@enum\n@enumName TestEnum'
      // It is difficult for sequelize use replacement, instead we use escape to avoid injection
      // UPDATE: this comment got syntax error with cockroach db, disable it for now. Waiting to be fixed.
      // See https://github.com/cockroachdb/cockroach/issues/44135

      if (this.dbType === SUPPORT_DB.cockRoach) {
        logger.warn(
          `Comment on enum ${e.description} is not supported with ${this.dbType}, enum name may display incorrectly in query service`
        );
      } else {
        const comment = this.sequelize.escape(
          `@enum\\n@enumName ${e.name}${e.description ? `\\n ${e.description}` : ''}`
        );
        await this.sequelize.query(`COMMENT ON TYPE ${type} IS E${comment}`);
      }
      enumTypeMap.set(e.name, type);
    }
    const extraQueries = [];
    // Function need to create ahead of triggers
    if (this.useSubscription) {
      extraQueries.push(createSendNotificationTriggerFunction(schema));
    }
    for (const model of this.modelsRelations.models) {
      const attributes = modelsTypeToModelAttributes(model, enumTypeMap);
      const indexes = model.indexes.map(({fields, unique, using}) => ({
        fields: fields.map((field) => Utils.underscoredIf(field, true)),
        unique,
        using,
      }));
      if (indexes.length > this.config.indexCountLimit) {
        throw new Error(`too many indexes on entity ${model.name}`);
      }
      if (this.historical) {
        this.addIdAndBlockRangeAttributes(attributes);
        this.addBlockRangeColumnToIndexes(indexes);
        this.addHistoricalIdIndex(model, indexes);
      }
      this.updateIndexesName(model.name, indexes);
      const sequelizeModel = this.sequelize.define(model.name, attributes, {
        underscored: true,
        comment: model.description,
        freezeTableName: false,
        createdAt: this.config.timestampField,
        updatedAt: this.config.timestampField,
        schema,
        indexes,
      });
      if (this.historical) {
        this.addScopeAndBlockHeightHooks(sequelizeModel);
        // TODO, remove id and block_range constrain, check id manually
        // see https://github.com/subquery/subql/issues/1542
      }

      if (this.useSubscription) {
        const triggerName = hashName(schema, 'notify_trigger', sequelizeModel.tableName);
        const notifyTriggers = await getTriggers(this.sequelize, triggerName);
        // Triggers not been found
        if (notifyTriggers.length === 0) {
          extraQueries.push(createNotifyTrigger(schema, sequelizeModel.tableName));
        } else {
          this.validateNotifyTriggers(triggerName, notifyTriggers as NotifyTriggerPayload[]);
        }
      } else {
        //TODO: DROP TRIGGER IF EXIST is not valid syntax for cockroach, better check trigger exist at first.
        if (this.dbType !== SUPPORT_DB.cockRoach) {
          extraQueries.push(dropNotifyTrigger(schema, sequelizeModel.tableName));
        }
      }
    }
    // We have to drop the function after all triggers depend on it are removed
    if (!this.useSubscription && this.dbType !== SUPPORT_DB.cockRoach) {
      extraQueries.push(dropNotifyFunction(schema));
    }

    const foreignKeyMap = new Map<string, Map<string, SmartTags>>();
    for (const relation of this.modelsRelations.relations) {
      const model = this.sequelize.model(relation.from);
      const relatedModel = this.sequelize.model(relation.to);
      if (this.historical) {
        this.addRelationToMap(relation, foreignKeyMap, model, relatedModel);
        continue;
      }
      switch (relation.type) {
        case 'belongsTo': {
          const rel = model.belongsTo(relatedModel, {foreignKey: relation.foreignKey});
          const fkConstraint = getFkConstraint(rel.source.tableName, rel.foreignKey);
          extraQueries.push(constraintDeferrableQuery(model.getTableName().toString(), fkConstraint));
          break;
        }
        case 'hasOne': {
          const rel = model.hasOne(relatedModel, {
            foreignKey: relation.foreignKey,
          });
          const fkConstraint = getFkConstraint(rel.target.tableName, rel.foreignKey);
          const tags = smartTags({
            singleForeignFieldName: relation.fieldName,
          });
          extraQueries.push(
            commentConstraintQuery(`"${schema}"."${rel.target.tableName}"`, fkConstraint, tags),
            createUniqueIndexQuery(schema, relatedModel.tableName, relation.foreignKey)
          );
          break;
        }
        case 'hasMany': {
          const rel = model.hasMany(relatedModel, {
            foreignKey: relation.foreignKey,
          });
          const fkConstraint = getFkConstraint(rel.target.tableName, rel.foreignKey);
          const tags = smartTags({
            foreignFieldName: relation.fieldName,
          });
          extraQueries.push(commentConstraintQuery(`"${schema}"."${rel.target.tableName}"`, fkConstraint, tags));

          break;
        }
        default:
          throw new Error('Relation type is not supported');
      }
    }
    foreignKeyMap.forEach((keys, tableName) => {
      const comment = Array.from(keys.values())
        .map((tags) => smartTags(tags, '|'))
        .join('\n');
      const query = commentTableQuery(`"${schema}"."${tableName}"`, comment);
      extraQueries.push(query);
    });
    if (this.config.proofOfIndex) {
      this.poiRepo = PoiFactory(this.sequelize, schema);
    }

    this.metaDataRepo = await MetadataFactory(
      this.sequelize,
      schema,
      this.config.multiChain,
      this.subqueryProject.network.chainId
    );

    await this.sequelize.sync();

    for (const query of extraQueries) {
      await this.sequelize.query(query);
    }
  }

  async getHistoricalStateEnabled(): Promise<boolean> {
    const {disableHistorical, multiChain} = this.config;

    try {
      const tableRes = await this.sequelize.query<Array<string>>(
        `SELECT table_name FROM information_schema.tables where table_schema='${this.schema}'`,
        {type: QueryTypes.SELECT}
      );

      const metadataTableNames = flatten(tableRes).filter(
        (value: string) => METADATA_REGEX.test(value) || MULTI_METADATA_REGEX.test(value)
      );

      if (metadataTableNames.length > 1 && !multiChain) {
        logger.error(
          'There are multiple projects in the database schema, if you are trying to multi-chain index use --multichain'
        );
        process.exit(1);
      }

      if (metadataTableNames.length === 1) {
        const res = await this.sequelize.query<{key: string; value: boolean | string}>(
          `SELECT key, value FROM "${this.schema}"."${metadataTableNames[0]}" WHERE (key = 'historicalStateEnabled' OR key = 'genesisHash')`,
          {type: QueryTypes.SELECT}
        );

        const store = res.reduce(function (total, current) {
          total[current.key] = current.value;
          return total;
        }, {} as {[key: string]: string | boolean});

        const useHistorical =
          store.historicalStateEnabled === undefined ? !disableHistorical : (store.historicalStateEnabled as boolean);

        if (useHistorical && multiChain) {
          logger.error(
            'Historical feature is enabled and not compatible with multi-chain, to multi-chain index clear postgres schema and re-index project using --multichain'
          );
          process.exit(1);
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

  private addBlockRangeColumnToIndexes(indexes: IndexesOptions[]): void {
    indexes.forEach((index) => {
      if (index.using === IndexType.GIN) {
        return;
      }
      index.fields.push('_block_range');
      index.using = IndexType.GIST;
      // GIST does not support unique indexes
      index.unique = false;
    });
  }

  private updateIndexesName(modelName: string, indexes: IndexesOptions[]): void {
    indexes.forEach((index) => {
      index.name = blake2AsHex(`${modelName}_${index.fields.join('_')}`, 64).substring(0, 63);
    });
  }

  // Only used with historical to add indexes to ID fields for gettign entitities by ID
  private addHistoricalIdIndex(model: GraphQLModelsType, indexes: IndexesOptions[]): void {
    const idFieldName = model.fields.find((field) => field.type === 'ID')?.name;
    if (idFieldName && !indexes.find((idx) => idx.fields.includes(idFieldName))) {
      indexes.push({
        fields: [Utils.underscoredIf(idFieldName, true)],
        unique: false,
        using: IndexType.GIST,
      });
    }
  }

  private addRelationToMap(
    relation: GraphQLRelationsType,
    foreignKeys: Map<string, Map<string, SmartTags>>,
    model: ModelStatic<any>,
    relatedModel: ModelStatic<any>
  ) {
    switch (relation.type) {
      case 'belongsTo': {
        addTagsToForeignKeyMap(foreignKeys, model.tableName, relation.foreignKey, {
          foreignKey: getVirtualFkTag(relation.foreignKey, relatedModel.tableName),
        });
        break;
      }
      case 'hasOne': {
        addTagsToForeignKeyMap(foreignKeys, relatedModel.tableName, relation.foreignKey, {
          singleForeignFieldName: relation.fieldName,
        });
        break;
      }
      case 'hasMany': {
        addTagsToForeignKeyMap(foreignKeys, relatedModel.tableName, relation.foreignKey, {
          foreignFieldName: relation.fieldName,
        });
        break;
      }
      default:
        throw new Error('Relation type is not supported');
    }
  }

  addIdAndBlockRangeAttributes(attributes: ModelAttributes<Model<any, any>, any>): void {
    (attributes.id as ModelAttributeColumnOptions).primaryKey = false;
    attributes.__id = {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    } as ModelAttributeColumnOptions;
    attributes.__block_range = {
      type: DataTypes.RANGE(DataTypes.BIGINT),
      allowNull: false,
    } as ModelAttributeColumnOptions;
  }

  private addScopeAndBlockHeightHooks(sequelizeModel: ModelStatic<any>): void {
    // TODO, check impact of remove this
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
  }

  private validateNotifyTriggers(triggerName: string, triggers: NotifyTriggerPayload[]): void {
    if (triggers.length !== NotifyTriggerManipulationType.length) {
      throw new Error(
        `Found ${triggers.length} ${triggerName} triggers, expected ${NotifyTriggerManipulationType.length} triggers `
      );
    }
    triggers.map((t) => {
      if (!NotifyTriggerManipulationType.includes(t.eventManipulation)) {
        throw new Error(`Found unexpected trigger ${t.triggerName} with manipulation ${t.eventManipulation}`);
      }
    });
  }

  setOperationStack(): void {
    if (this.config.proofOfIndex) {
      this.operationStack = new StoreOperations(this.modelsRelations.models);
    }
  }

  setBlockHeight(blockHeight: number): void {
    this.blockHeight = blockHeight;
  }

  getOperationMerkleRoot(): Uint8Array {
    if (this.config.proofOfIndex) {
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

  async rewind(targetBlockHeight: number, transaction: Transaction): Promise<void> {
    for (const model of Object.values(this.sequelize.models)) {
      if ('__block_range' in model.getAttributes()) {
        await model.destroy({
          transaction,
          hooks: false,
          where: this.sequelize.where(
            this.sequelize.fn('lower', this.sequelize.col('_block_range')),
            Op.gt,
            targetBlockHeight
          ),
        });
        await model.update(
          {
            __block_range: this.sequelize.fn(
              'int8range',
              this.sequelize.fn('lower', this.sequelize.col('_block_range')),
              null
            ),
          },
          {
            transaction,
            hooks: false,
            where: {
              __block_range: {
                [Op.contains]: targetBlockHeight,
              },
            },
          }
        );
      }
    }
    this.metadataModel.set('lastProcessedHeight', targetBlockHeight);
    if (this.config.proofOfIndex) {
      await this.poiRepo.destroy({
        transaction,
        where: {
          id: {
            [Op.gt]: targetBlockHeight,
          },
        },
      });
      this.metadataModel.set('lastPoiHeight', targetBlockHeight);
    }
  }

  getStore(): Store {
    return {
      count: async <T extends Entity>(
        entity: string,
        field?: keyof T,
        value?: T[keyof T] | T[keyof T][],
        options?: {
          distinct?: boolean;
          col?: keyof T;
        }
      ): Promise<number> => {
        try {
          return this.storeCache.getModel<T>(entity).count(field, value, options);
        } catch (e) {
          throw new Error(`Failed to count Entity ${entity}, ${e}`);
        }
      },
      get: async <T extends Entity>(entity: string, id: string): Promise<T | undefined> => {
        try {
          return this.storeCache.getModel<T>(entity).get(id);
        } catch (e) {
          throw new Error(`Failed to get Entity ${entity} with id ${id}: ${e}`);
        }
      },
      getByField: async <T extends Entity>(
        entity: string,
        field: keyof T,
        value: T[keyof T] | T[keyof T][],
        options: {
          offset?: number;
          limit?: number;
        } = {}
      ): Promise<T[] | undefined> => {
        try {
          const indexed =
            this.modelIndexedFields.findIndex(
              (indexField) =>
                upperFirst(camelCase(indexField.entityName)) === entity && camelCase(indexField.fieldName) === field
            ) > -1;
          assert(indexed, `to query by field ${String(field)}, an index must be created on model ${entity}`);
          if (options?.limit && this.config.queryLimit < options?.limit) {
            logger.warn(
              `store getByField for entity ${entity} with ${options.limit} records exceeds config limit ${this.config.queryLimit}. Will use ${this.config.queryLimit} as the limit.`
            );
          }
          const finalLimit = options.limit ? Math.min(options.limit, this.config.queryLimit) : this.config.queryLimit;
          if (options.offset === undefined) {
            options.offset = 0;
          }
          return this.storeCache
            .getModel<T>(entity)
            .getByField(field, value, {limit: finalLimit, offset: options.offset});
        } catch (e) {
          throw new Error(`Failed to getByField Entity ${entity} with field ${String(field)}: ${e}`);
        }
      },
      getOneByField: async <T extends Entity>(
        entity: string,
        field: keyof T,
        value: T[keyof T]
        // eslint-disable-next-line @typescript-eslint/require-await
      ): Promise<T | undefined> => {
        try {
          const indexed =
            this.modelIndexedFields.findIndex(
              (indexField) =>
                upperFirst(camelCase(indexField.entityName)) === entity &&
                camelCase(indexField.fieldName) === field &&
                indexField.isUnique
            ) > -1;
          assert(indexed, `to query by field ${String(field)}, an unique index must be created on model ${entity}`);
          return this.storeCache.getModel<T>(entity).getOneByField(field, value);
        } catch (e) {
          throw new Error(`Failed to getOneByField Entity ${entity} with field ${String(field)}: ${e}`);
        }
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      set: async (entity: string, _id: string, data: Entity): Promise<void> => {
        try {
          this.storeCache.getModel(entity).set(_id, data, this.blockHeight);

          if (this.config.proofOfIndex) {
            this.operationStack.put(OperationType.Set, entity, data);
          }
        } catch (e) {
          throw new Error(`Failed to set Entity ${entity} with _id ${_id}: ${e}`);
        }
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      bulkCreate: async (entity: string, data: Entity[]): Promise<void> => {
        try {
          this.storeCache.getModel(entity).bulkCreate(data, this.blockHeight);

          if (this.config.proofOfIndex) {
            for (const item of data) {
              this.operationStack.put(OperationType.Set, entity, item);
            }
          }
        } catch (e) {
          throw new Error(`Failed to bulkCreate Entity ${entity}: ${e}`);
        }
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      bulkUpdate: async (entity: string, data: Entity[], fields?: string[]): Promise<void> => {
        try {
          this.storeCache.getModel(entity).bulkUpdate(data, this.blockHeight, fields);
          if (this.config.proofOfIndex) {
            for (const item of data) {
              this.operationStack.put(OperationType.Set, entity, item);
            }
          }
        } catch (e) {
          throw new Error(`Failed to bulkCreate Entity ${entity}: ${e}`);
        }
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      remove: async (entity: string, id: string): Promise<void> => {
        try {
          this.storeCache.getModel(entity).remove(id, this.blockHeight);

          if (this.config.proofOfIndex) {
            this.operationStack.put(OperationType.Remove, entity, id);
          }
        } catch (e) {
          throw new Error(`Failed to remove Entity ${entity} with id ${id}: ${e}`);
        }
      },
    };
  }
}
