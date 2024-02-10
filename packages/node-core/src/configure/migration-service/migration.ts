// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {SUPPORT_DB} from '@subql/common';
import {
  getAllEntitiesRelations,
  GraphQLEntityField,
  GraphQLEntityIndex,
  GraphQLModelsRelationsEnums,
  GraphQLModelsType,
  GraphQLRelationsType,
  hashName,
} from '@subql/utils';
import {
  IndexesOptions,
  ModelAttributeColumnReferencesOptions,
  ModelAttributes,
  ModelStatic,
  Sequelize,
  Transaction,
  Utils,
} from '@subql/x-sequelize';
import {GraphQLSchema} from 'graphql';
import Pino from 'pino';
import {StoreService} from '../../indexer';
import {getLogger} from '../../logger';
import {
  addRelationToMap,
  addTagsToForeignKeyMap,
  BTREE_GIST_EXTENSION_EXIST_QUERY,
  commentConstraintQuery,
  commentTableQuery,
  constraintDeferrableQuery,
  createNotifyTrigger,
  createUniqueIndexQuery,
  dropNotifyFunction,
  dropNotifyTrigger,
  formatAttributes,
  formatColumnName,
  generateCreateIndexStatement,
  generateCreateTableStatement,
  generateForeignKeyStatement,
  generateHashedIndexName,
  getFkConstraint,
  getTriggers,
  modelToTableName,
  NotifyTriggerPayload,
  SmartTags,
  smartTags,
  syncEnums,
  validateNotifyTriggers,
} from '../../utils';
import {getColumnOption, modelsTypeToModelAttributes} from '../../utils/graphql';
import {
  addBlockRangeColumnToIndexes,
  addHistoricalIdIndex,
  addIdAndBlockRangeAttributes,
  getExistedIndexesQuery,
  updateIndexesName,
} from '../../utils/sync-helper';
import {NodeConfig} from '../NodeConfig';

const logger = getLogger('db-manager');

export class Migration {
  private sequelizeModels: ModelStatic<any>[] = [];
  private tableQueries: string[] = [];
  private readonly historical: boolean;
  private extraQueries: string[] = [];
  private foreignKeyMap: Map<string, Map<string, SmartTags>> = new Map<string, Map<string, SmartTags>>();
  private useSubscription: boolean;

  constructor(
    private sequelize: Sequelize,
    private storeService: StoreService,
    private schemaName: string,
    private config: NodeConfig,
    private enumTypeMap: Map<string, string>,
    private dbType: SUPPORT_DB
  ) {
    this.historical = !config.disableHistorical;
    this.useSubscription = config.subscription;
    if (this.useSubscription && dbType === SUPPORT_DB.cockRoach) {
      this.useSubscription = false;
      logger.warn(`Subscription is not support with ${this.dbType}`);
    }
  }

  static async create(
    sequelize: Sequelize,
    storeService: StoreService,
    schemaName: string,
    nextSchema: GraphQLSchema,
    currentSchema: GraphQLSchema,
    config: NodeConfig,
    logger: Pino.Logger,
    dbType: SUPPORT_DB
  ): Promise<Migration> {
    const modelsRelationsEnums = getAllEntitiesRelations(nextSchema);

    const enumTypeMap = new Map<string, string>();
    for (const e of modelsRelationsEnums.enums) {
      await syncEnums(sequelize, dbType, e, schemaName, enumTypeMap, logger);
    }

    const migration = new Migration(sequelize, storeService, schemaName, config, enumTypeMap, dbType);
    migration.loadExistingForeignKeys(getAllEntitiesRelations(currentSchema));
    return migration;
  }

  async run(transaction: Transaction | undefined): Promise<ModelStatic<any>[]> {
    const effectiveTransaction = transaction ?? (await this.sequelize.transaction());

    try {
      for (const query of this.tableQueries) {
        await this.sequelize.query(query, {transaction: effectiveTransaction});
      }

      for (const query of this.extraQueries) {
        await this.sequelize.query(query, {transaction: effectiveTransaction});
      }

      if (!transaction) {
        await effectiveTransaction.commit();
      }
    } catch (e) {
      if (!transaction) {
        await effectiveTransaction.rollback();
      }
      throw e;
    }

    return this.sequelizeModels;
  }

  private prepareModelAttributesAndIndexes(model: GraphQLModelsType): {
    attributes: ModelAttributes<any>;
    indexes: IndexesOptions[];
  } {
    const attributes = modelsTypeToModelAttributes(model, this.enumTypeMap);
    if (this.historical) {
      addIdAndBlockRangeAttributes(attributes);
    }

    const indexes = model.indexes.map(({fields, unique, using}) => ({
      fields: fields.map((field) => Utils.underscoredIf(field, true)),
      unique,
      using,
    }));

    return {attributes, indexes};
  }

  private loadExistingForeignKeys(modelsRelationsEnums: GraphQLModelsRelationsEnums): void {
    for (const relation of modelsRelationsEnums.relations) {
      const model = this.sequelize.model(relation.from);
      const relatedModel = this.sequelize.model(relation.to);
      Object.values(model.associations).forEach(() => {
        addRelationToMap(relation, this.foreignKeyMap, model, relatedModel);
      });
    }
  }

  private addModelToSequelizeCache(sequelizeModel: ModelStatic<any>): void {
    const modelName = sequelizeModel.name;

    if (!this.sequelizeModels.find((m) => m.name === modelName)) {
      this.sequelizeModels.push(sequelizeModel);
    }
  }

  private createSequelizeModel(model: GraphQLModelsType): ModelStatic<any> {
    const {attributes, indexes} = this.prepareModelAttributesAndIndexes(model);
    return this.storeService.defineModel(model, attributes, indexes, this.schemaName);
  }

  async createTable(model: GraphQLModelsType): Promise<void> {
    const {attributes, indexes} = this.prepareModelAttributesAndIndexes(model);
    const [indexesResult] = await this.sequelize.query(getExistedIndexesQuery(this.schemaName));
    const existedIndexes = indexesResult.map((i) => (i as any).indexname);

    if (indexes.length > this.config.indexCountLimit) {
      throw new Error(`too many indexes on entity ${model.name}`);
    }

    if (this.historical) {
      addBlockRangeColumnToIndexes(indexes);
      addHistoricalIdIndex(model, indexes);
    }

    updateIndexesName(model.name, indexes, existedIndexes);

    const sequelizeModel = this.storeService.defineModel(model, attributes, indexes, this.schemaName);

    this.tableQueries.push(...generateCreateTableStatement(sequelizeModel, this.schemaName));

    if (sequelizeModel.options.indexes) {
      this.tableQueries.push(
        ...generateCreateIndexStatement(sequelizeModel.options.indexes, this.schemaName, sequelizeModel.tableName)
      );
    }

    if (this.useSubscription) {
      const triggerName = hashName(this.schemaName, 'notify_trigger', sequelizeModel.tableName);
      const notifyTriggers = await getTriggers(this.sequelize, triggerName);
      // Triggers not been found
      if (notifyTriggers.length === 0) {
        this.extraQueries.push(createNotifyTrigger(this.schemaName, sequelizeModel.tableName));
      } else {
        validateNotifyTriggers(triggerName, notifyTriggers as NotifyTriggerPayload[]);
      }
    } else {
      //TODO: DROP TRIGGER IF EXIST is not valid syntax for cockroach, better check trigger exist at first.
      if (this.dbType !== SUPPORT_DB.cockRoach) {
        this.extraQueries.push(dropNotifyTrigger(this.schemaName, sequelizeModel.tableName));
      }
    }

    if (!this.useSubscription && this.dbType !== SUPPORT_DB.cockRoach) {
      this.extraQueries.push(dropNotifyFunction(this.schemaName));
    }

    this.addModelToSequelizeCache(sequelizeModel);
  }

  dropTable(model: GraphQLModelsType): void {
    const tableName = modelToTableName(model.name);

    // should prioritise dropping the triggers
    this.tableQueries.unshift(dropNotifyTrigger(this.schemaName, tableName));
    this.tableQueries.push(`DROP TABLE IF EXISTS "${this.schemaName}"."${tableName}";`);
  }

  createColumn(model: GraphQLModelsType, field: GraphQLEntityField): void {
    const sequelizeModel = this.createSequelizeModel(model);

    const columnOptions = getColumnOption(field, this.enumTypeMap);
    if (columnOptions.primaryKey) {
      throw new Error('Primary Key migration upgrade is not allowed');
    }

    if (!columnOptions.allowNull) {
      throw new Error(`Non-nullable field creation is not supported: ${field.name} on ${model.name}`);
    }

    const dbTableName = modelToTableName(model.name);
    const dbColumnName = formatColumnName(field.name);

    const formattedAttributes = formatAttributes(columnOptions, this.schemaName, false);
    this.tableQueries.push(
      `ALTER TABLE "${this.schemaName}"."${dbTableName}" ADD COLUMN "${dbColumnName}" ${formattedAttributes};`
    );

    if (columnOptions.comment) {
      this.extraQueries.push(
        `COMMENT ON COLUMN "${this.schemaName}".${dbTableName}.${dbColumnName} IS '${columnOptions.comment}';`
      );
    }

    this.addModelToSequelizeCache(sequelizeModel);
  }

  dropColumn(model: GraphQLModelsType, field: GraphQLEntityField): void {
    this.tableQueries.push(
      `ALTER TABLE  "${this.schemaName}"."${modelToTableName(model.name)}" DROP COLUMN IF EXISTS ${formatColumnName(
        field.name
      )};`
    );

    this.addModelToSequelizeCache(this.createSequelizeModel(model));
  }

  createIndex(model: GraphQLModelsType, index: GraphQLEntityIndex): void {
    const formattedTableName = modelToTableName(model.name);
    const indexOptions: IndexesOptions = {...index, fields: index.fields.map((f) => formatColumnName(f))};

    if (this.historical) {
      addBlockRangeColumnToIndexes([indexOptions]);
      addHistoricalIdIndex(model, [indexOptions]);
    }

    indexOptions.name = generateHashedIndexName(model.name, indexOptions);

    if (!indexOptions.fields || indexOptions.fields.length === 0) {
      throw new Error("The 'fields' property is required and cannot be empty.");
    }

    const createIndexQuery =
      `CREATE ${indexOptions.unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS "${indexOptions.name}" ` +
      `ON "${this.schemaName}"."${formattedTableName}" ` +
      `${indexOptions.using ? `USING ${indexOptions.using} ` : ''}` +
      `(${indexOptions.fields.join(', ')})`;

    this.tableQueries.push(createIndexQuery);
  }

  dropIndex(model: GraphQLModelsType, index: GraphQLEntityIndex): void {
    const hashedIndexName = generateHashedIndexName(model.name, index);
    this.tableQueries.push(`DROP INDEX IF EXISTS "${this.schemaName}"."${hashedIndexName}";`);
  }

  createRelation(relation: GraphQLRelationsType): void {
    const model = this.sequelize.model(relation.from);
    const relatedModel = this.sequelize.model(relation.to);
    if (this.foreignKeyMap.get(model.tableName)?.has(relation.foreignKey)) {
      return;
    }

    if (this.historical) {
      addRelationToMap(relation, this.foreignKeyMap, model, relatedModel);
    } else {
      switch (relation.type) {
        case 'belongsTo': {
          model.belongsTo(relatedModel, {foreignKey: relation.foreignKey});
          addRelationToMap(relation, this.foreignKeyMap, model, relatedModel);
          // TODO cockroach support
          // logger.warn(`Relation: ${model.tableName} to ${relatedModel.tableName} is ONLY supported by postgresDB`);
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
          this.extraQueries.push(
            commentConstraintQuery(`"${this.schemaName}"."${rel.target.tableName}"`, fkConstraint, tags),
            createUniqueIndexQuery(this.schemaName, relatedModel.tableName, relation.foreignKey)
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
          this.extraQueries.push(
            commentConstraintQuery(`"${this.schemaName}"."${rel.target.tableName}"`, fkConstraint, tags)
          );
          break;
        }
        default:
          throw new Error('Relation type is not supported');
      }
      const relationQuery = generateForeignKeyStatement(model.getAttributes()[relation.foreignKey], model.tableName);
      assert(relationQuery);
      this.tableQueries.push(relationQuery);
    }

    this.addModelToSequelizeCache(model);
  }

  addRelationComments(): void {
    this.foreignKeyMap.forEach((keys, tableName) => {
      const comment = Array.from(keys.values())
        .map((tags) => smartTags(tags, '|'))
        .join('\n');
      const query = commentTableQuery(`"${this.schemaName}"."${tableName}"`, comment);
      this.extraQueries.push(query);
    });
  }

  dropRelation(relation: GraphQLRelationsType): void {
    if (relation.type !== 'belongsTo') {
      return;
    }
    const tableName = modelToTableName(relation.from);
    const fkConstraint = getFkConstraint(tableName, relation.foreignKey);
    const dropFkeyStatement = `ALTER TABLE "${this.schemaName}"."${tableName}" DROP CONSTRAINT ${fkConstraint};`;
    this.tableQueries.unshift(dropFkeyStatement);
  }
}
