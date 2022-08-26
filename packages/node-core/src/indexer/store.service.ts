// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {isMainThread} from 'worker_threads';
import {Injectable} from '@nestjs/common';
import {hexToU8a, u8aToBuffer} from '@polkadot/util';
import {blake2AsHex} from '@polkadot/util-crypto';
import {Entity, Store} from '@subql/types';
import {GraphQLModelsRelationsEnums, GraphQLRelationsType, IndexType} from '@subql/utils';
import {camelCase, flatten, isEqual, upperFirst} from 'lodash';
import {
  CreationAttributes,
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
  UpsertOptions,
  Utils,
} from 'sequelize';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {
  commentTableQuery,
  commentConstraintQuery,
  createNotifyTrigger,
  createSendNotificationTriggerFunction,
  createUniqueIndexQuery,
  dropNotifyTrigger,
  getFkConstraint,
  getNotifyTriggers,
  SmartTags,
  smartTags,
  getVirtualFkTag,
  addTagsToForeignKeyMap,
  createExcludeConstraintQuery,
  BTREE_GIST_EXTENSION_EXIST_QUERY,
  modelsTypeToModelAttributes,
  camelCaseObjectKey,
  makeTriggerName,
} from '../utils';
import {getYargsOption} from '../yargs';
import {Metadata, MetadataFactory, MetadataRepo, PoiFactory, PoiRepo, ProofOfIndex} from './entities';
import {StoreOperations} from './StoreOperations';
import {OperationType} from './types';

const logger = getLogger('store');
const NULL_MERKEL_ROOT = hexToU8a('0x00');
const {argv} = getYargsOption();
const NotifyTriggerManipulationType = [`INSERT`, `DELETE`, `UPDATE`];
const KEY_FIELDS = ['id', '__id', '__block_range'];

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
  private tx?: Transaction;
  private modelIndexedFields: IndexField[];
  private schema: string;
  private modelsRelations: GraphQLModelsRelationsEnums;
  private poiRepo: PoiRepo;
  private metaDataRepo: MetadataRepo;
  private operationStack: StoreOperations;
  private blockHeight: number;
  historical: boolean;

  constructor(private sequelize: Sequelize, private config: NodeConfig) {}

  async init(modelsRelations: GraphQLModelsRelationsEnums, schema: string): Promise<void> {
    this.schema = schema;
    this.modelsRelations = modelsRelations;
    this.historical = await this.getHistoricalStateEnabled();

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
  }

  async incrementBlockCount(tx: Transaction): Promise<void> {
    await this.sequelize.query(
      `UPDATE "${this.schema}"._metadata SET value = (COALESCE(value->0):: int + 1)::text::jsonb WHERE key ='processedBlockCount'`,
      {transaction: tx}
    );
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
      const enumTypeName = `${schema}_enum_${this.enumNameToHash(e.name)}`;

      const [results] = await this.sequelize.query(
        `select e.enumlabel as enum_value
         from pg_type t
         join pg_enum e on t.oid = e.enumtypid
         where t.typname = ?
         order by enumsortorder;`,
        {replacements: [enumTypeName]}
      );

      if (results.length === 0) {
        await this.sequelize.query(`CREATE TYPE "${enumTypeName}" as ENUM (${e.values.map(() => '?').join(',')});`, {
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

      const comment = `@enum\\n@enumName ${e.name}${e.description ? `\\n ${e.description}` : ''}`;

      await this.sequelize.query(`COMMENT ON TYPE "${enumTypeName}" IS E?`, {
        replacements: [comment],
      });
      enumTypeMap.set(e.name, `"${enumTypeName}"`);
    }
    const extraQueries = [];
    if (argv.subscription) {
      extraQueries.push(createSendNotificationTriggerFunction);
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
      }
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
        extraQueries.push(createExcludeConstraintQuery(schema, sequelizeModel.tableName));
      }
      if (argv.subscription) {
        const triggerName = makeTriggerName(schema, sequelizeModel.tableName);
        const triggers = await this.sequelize.query(getNotifyTriggers(), {
          replacements: {triggerName},
          type: QueryTypes.SELECT,
        });
        // Triggers not been found
        if (triggers.length === 0) {
          extraQueries.push(createNotifyTrigger(schema, sequelizeModel.tableName));
        } else {
          this.validateNotifyTriggers(triggerName, triggers as NotifyTriggerPayload[]);
        }
      } else {
        extraQueries.push(dropNotifyTrigger(schema, sequelizeModel.tableName));
      }
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
          model.belongsTo(relatedModel, {foreignKey: relation.foreignKey});
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
    this.metaDataRepo = MetadataFactory(this.sequelize, schema);

    // this will allow alter current entity, including fields
    // TODO, add rules for changes, eg only allow add nullable field
    // Only allow altering the tables on the main thread
    await this.sequelize.sync({alter: {drop: isMainThread}});
    await this.setMetadata('historicalStateEnabled', this.historical);
    for (const query of extraQueries) {
      await this.sequelize.query(query);
    }
  }

  async getHistoricalStateEnabled(): Promise<boolean> {
    let enabled = true;
    try {
      // Throws if _metadata doesn't exist (first startup)
      const result = await this.sequelize.query<{value: boolean}>(
        `SELECT value FROM "${this.schema}"."_metadata" WHERE key = 'historicalStateEnabled'`,
        {type: QueryTypes.SELECT}
      );
      if (result.length > 0) {
        enabled = result[0].value;
      } else {
        enabled = false;
      }
    } catch (e) {
      enabled = !argv['disable-historical'];
    }
    logger.info(`Historical state is ${enabled ? 'enabled' : 'disabled'}`);
    return enabled;
  }

  addBlockRangeColumnToIndexes(indexes: IndexesOptions[]): void {
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
    sequelizeModel.addHook('beforeBulkCreate', (instances, options) => {
      instances.forEach((item) => {
        item.__block_range = [this.blockHeight, null];
      });
    });
  }

  validateNotifyTriggers(triggerName: string, triggers: NotifyTriggerPayload[]): void {
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

  enumNameToHash(enumName: string): string {
    return blake2AsHex(enumName).substr(2, 10);
  }

  setTransaction(tx: Transaction): void {
    this.tx = tx;
    tx.afterCommit(() => (this.tx = undefined));
    if (this.config.proofOfIndex) {
      this.operationStack = new StoreOperations(this.modelsRelations.models);
    }
  }

  setBlockHeight(blockHeight: number): void {
    this.blockHeight = blockHeight;
  }

  async setMetadataBatch(metadata: Metadata[], options?: UpsertOptions<Metadata>): Promise<void> {
    await Promise.all(metadata.map(({key, value}) => this.setMetadata(key, value, options)));
  }

  async setMetadata(key: string, value: string | number | boolean, options?: UpsertOptions<Metadata>): Promise<void> {
    assert(this.metaDataRepo, `Model _metadata does not exist`);
    await this.metaDataRepo.upsert({key, value}, options);
  }

  async setPoi(blockPoi: ProofOfIndex, options?: UpsertOptions<ProofOfIndex>): Promise<void> {
    assert(this.poiRepo, `Model _poi does not exist`);
    blockPoi.chainBlockHash = u8aToBuffer(blockPoi.chainBlockHash);
    blockPoi.hash = u8aToBuffer(blockPoi.hash);
    blockPoi.parentHash = u8aToBuffer(blockPoi.parentHash);
    await this.poiRepo.upsert(blockPoi, options);
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

  private async markAsDeleted(model: ModelStatic<any>, id: string) {
    return model.update(
      {
        __block_range: this.sequelize.fn(
          'int8range',
          this.sequelize.fn('lower', this.sequelize.col('_block_range')),
          this.blockHeight
        ),
      },
      {
        hooks: false,
        transaction: this.tx,
        where: {
          id: id,
          __block_range: {
            [Op.contains]: this.blockHeight as any,
          },
        },
      }
    );
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

    await this.setMetadata('lastProcessedHeight', targetBlockHeight, {
      transaction,
    });
    if (this.config.proofOfIndex) {
      await this.poiRepo.destroy({
        transaction,
        where: {
          id: {
            [Op.gt]: targetBlockHeight,
          },
        },
      });
      await this.setMetadata('lastPoiHeight', targetBlockHeight, {
        transaction,
      });
    }
  }

  getStore(): Store {
    return {
      get: async <T extends Entity>(entity: string, id: string): Promise<T | undefined> => {
        try {
          const model = this.sequelize.model(entity);
          assert(model, `model ${entity} not exists`);
          const record = await model.findOne({
            where: {id},
            transaction: this.tx,
          });
          return record?.toJSON() as T;
        } catch (e) {
          throw new Error(`Failed to get Entity ${entity} with id ${id}: ${e}`);
        }
      },
      getByField: async <T extends Entity>(
        entity: string,
        field: keyof T,
        value: T[keyof T] | T[keyof T][],
        options?: {
          offset?: number;
          limit?: number;
        }
      ): Promise<T[] | undefined> => {
        try {
          const model = this.sequelize.model(entity);
          assert(model, `model ${entity} not exists`);
          const indexed =
            this.modelIndexedFields.findIndex(
              (indexField) =>
                upperFirst(camelCase(indexField.entityName)) === entity && camelCase(indexField.fieldName) === field
            ) > -1;
          assert(indexed, `to query by field ${String(field)}, an index must be created on model ${entity}`);
          const records = await model.findAll({
            where: {[field]: value},
            transaction: this.tx,
            limit: options?.limit ?? this.config.queryLimit,
            offset: options?.offset,
          });
          return records.map((record) => record.toJSON() as T);
        } catch (e) {
          throw new Error(`Failed to getByField Entity ${entity} with field ${String(field)}: ${e}`);
        }
      },
      getOneByField: async <T extends Entity>(
        entity: string,
        field: keyof T,
        value: T[keyof T]
      ): Promise<T | undefined> => {
        try {
          const model = this.sequelize.model(entity);
          assert(model, `model ${entity} not exists`);
          const indexed =
            this.modelIndexedFields.findIndex(
              (indexField) =>
                upperFirst(camelCase(indexField.entityName)) === entity &&
                camelCase(indexField.fieldName) === field &&
                indexField.isUnique
            ) > -1;
          assert(indexed, `to query by field ${String(field)}, an unique index must be created on model ${entity}`);
          const record = await model.findOne({
            where: {[field]: value},
            transaction: this.tx,
          });
          return record?.toJSON() as T;
        } catch (e) {
          throw new Error(`Failed to getOneByField Entity ${entity} with field ${String(field)}: ${e}`);
        }
      },
      set: async (entity: string, _id: string, data: Entity): Promise<void> => {
        try {
          const model = this.sequelize.model(entity);
          assert(model, `model ${entity} not exists`);
          const attributes = data as unknown as CreationAttributes<Model>;
          if (this.historical) {
            const [updatedRows] = await model.update(attributes, {
              hooks: false,
              transaction: this.tx,
              where: this.sequelize.and(
                {id: data.id},
                this.sequelize.where(this.sequelize.fn('lower', this.sequelize.col('_block_range')), this.blockHeight)
              ),
            });
            if (updatedRows < 1) {
              await this.markAsDeleted(model, data.id);
              await model.create(attributes, {
                transaction: this.tx,
              });
            }
          } else {
            await model.upsert(attributes, {
              transaction: this.tx,
            });
          }
          if (this.config.proofOfIndex) {
            this.operationStack.put(OperationType.Set, entity, data);
          }
        } catch (e) {
          throw new Error(`Failed to set Entity ${entity} with _id ${_id}: ${e}`);
        }
      },
      bulkCreate: async (entity: string, data: Entity[]): Promise<void> => {
        try {
          const model = this.sequelize.model(entity);
          assert(model, `model ${entity} not exists`);
          await model.bulkCreate(data as unknown as CreationAttributes<Model>[], {
            transaction: this.tx,
          });
          if (this.config.proofOfIndex) {
            for (const item of data) {
              this.operationStack.put(OperationType.Set, entity, item);
            }
          }
        } catch (e) {
          throw new Error(`Failed to bulkCreate Entity ${entity}: ${e}`);
        }
      },

      bulkUpdate: async (entity: string, data: Entity[], fields?: string[]): Promise<void> => {
        try {
          const model = this.sequelize.model(entity);
          assert(model, `model ${entity} not exists`);
          if (this.historical) {
            if (fields.length !== 0) {
              logger.warn(`Update specified fields with historical feature is not supported`);
            }
            const newRecordAttributes: CreationAttributes<Model>[] = [];
            await Promise.all(
              data.map(async (record) => {
                const attributes = record as unknown as CreationAttributes<Model>;
                const [updatedRows] = await model.update(attributes, {
                  hooks: false,
                  transaction: this.tx,
                  where: this.sequelize.and(
                    {id: record.id},
                    this.sequelize.where(
                      this.sequelize.fn('lower', this.sequelize.col('_block_range')),
                      this.blockHeight
                    )
                  ),
                });
                if (updatedRows < 1) {
                  await this.markAsDeleted(model, record.id);
                  newRecordAttributes.push(attributes);
                }
              })
            );
            if (newRecordAttributes.length !== 0) {
              await model.bulkCreate(newRecordAttributes, {
                transaction: this.tx,
              });
            }
          } else {
            const modelFields =
              fields ?? Object.keys(model.getAttributes()).filter((item) => !KEY_FIELDS.includes(item));
            await model.bulkCreate(data as unknown as CreationAttributes<Model>[], {
              transaction: this.tx,
              updateOnDuplicate: modelFields,
            });
          }
          if (this.config.proofOfIndex) {
            for (const item of data) {
              this.operationStack.put(OperationType.Set, entity, item);
            }
          }
        } catch (e) {
          throw new Error(`Failed to bulkCreate Entity ${entity}: ${e}`);
        }
      },

      remove: async (entity: string, id: string): Promise<void> => {
        try {
          const model = this.sequelize.model(entity);
          assert(model, `model ${entity} not exists`);
          if (this.historical) {
            await this.markAsDeleted(model, id);
          } else {
            await model.destroy({where: {id}, transaction: this.tx});
          }
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
