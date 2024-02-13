// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SUPPORT_DB} from '@subql/common';
import {
  getAllEntitiesRelations,
  GraphQLEntityField,
  GraphQLEntityIndex,
  GraphQLEnumsType,
  GraphQLModelsType,
  GraphQLRelationsType,
  hashName,
  IndexType,
} from '@subql/utils';
import {IndexesOptions, ModelAttributes, ModelStatic, Sequelize, Transaction, Utils} from '@subql/x-sequelize';
import {GraphQLSchema} from 'graphql';
import {isEqual} from 'lodash';
import {StoreService} from '../../indexer';
import {getLogger} from '../../logger';
import {
  addRelationToMap,
  commentColumnQuery,
  commentConstraintQuery,
  commentOnEnumStatement,
  commentTableQuery,
  constraintDeferrableQuery,
  createColumnStatement,
  createEnumStatement,
  createIndexStatement,
  createNotifyTrigger,
  createSendNotificationTriggerFunction,
  createUniqueIndexQuery,
  dropColumnStatement,
  dropEumStatement,
  dropIndexStatement,
  dropNotifyFunction,
  dropNotifyTrigger,
  dropRelationStatement,
  enumNameToHash,
  formatAttributes,
  formatColumnName,
  generateCreateIndexStatement,
  generateCreateTableStatement,
  generateForeignKeyStatement,
  generateHashedIndexName,
  getEnumDeprecated,
  getFkConstraint,
  getTriggers,
  modelToTableName,
  NotifyTriggerPayload,
  SmartTags,
  smartTags,
  validateNotifyTriggers,
  addBlockRangeColumnToIndexes,
  addHistoricalIdIndex,
  addIdAndBlockRangeAttributes,
  getExistedIndexesQuery,
  updateIndexesName,
  getColumnOption,
  modelsTypeToModelAttributes,
} from '../../utils';
import {NodeConfig} from '../NodeConfig';
import {loadExistingEnums, loadExistingForeignKeys} from './migration-helpers';

type RemovedIndexes = Record<string, IndexesOptions[]>;

const logger = getLogger('db-manager');

export class Migration {
  private sequelizeModels: ModelStatic<any>[] = [];
  /*
  mainQueries are used for executions, that are not reliant on any prior db operations
  extraQueries are executions, that are reliant on certain db operations, e.g. comments on foreignKeys or comments on tables, should be executed only after the table has been created
   */
  private mainQueries: string[] = [];
  private extraQueries: string[] = [];
  private readonly historical: boolean;
  private useSubscription: boolean;
  private foreignKeyMap: Map<string, Map<string, SmartTags>>;
  private enumTypeMap: Map<string, string>;
  // TODO i think this can be removed
  private removedIndexes: RemovedIndexes = {};

  private constructor(
    private sequelize: Sequelize,
    private storeService: StoreService,
    private schemaName: string,
    private config: NodeConfig,
    private dbType: SUPPORT_DB,
    // TODO refactor load map funcs
    private initForeignKeyMap: Map<string, Map<string, SmartTags>>,
    private initEnumTypeMap: Map<string, string>
  ) {
    this.historical = !config.disableHistorical;
    this.useSubscription = config.subscription;

    // TODO test if this is working, enable, then disable
    if (this.useSubscription && dbType === SUPPORT_DB.cockRoach) {
      this.useSubscription = false;
      logger.warn(`Subscription is not support with ${this.dbType}`);
    }

    this.foreignKeyMap = this.initForeignKeyMap;
    this.enumTypeMap = this.initEnumTypeMap;
  }

  static async create(
    sequelize: Sequelize,
    storeService: StoreService,
    schemaName: string,
    currentSchema: GraphQLSchema | null,
    config: NodeConfig,
    dbType: SUPPORT_DB
  ): Promise<Migration> {
    const currentModelsRelationsEnums = getAllEntitiesRelations(currentSchema);
    const foreignKeyMap = loadExistingForeignKeys(currentModelsRelationsEnums.relations, sequelize);
    const enumTypeMap = await loadExistingEnums(currentModelsRelationsEnums.enums, schemaName, sequelize);

    const migration = new Migration(sequelize, storeService, schemaName, config, dbType, foreignKeyMap, enumTypeMap);

    if (migration.useSubscription) {
      migration.extraQueries.push(createSendNotificationTriggerFunction(schemaName));
    }

    return migration;
  }

  async run(transaction: Transaction | undefined): Promise<ModelStatic<any>[]> {
    const effectiveTransaction = transaction ?? (await this.sequelize.transaction());

    try {
      for (const query of this.mainQueries) {
        await this.sequelize.query(query, {transaction: effectiveTransaction});
      }

      for (const query of this.extraQueries) {
        await this.sequelize.query(query, {transaction: effectiveTransaction});
      }

      await effectiveTransaction.commit();
    } catch (e) {
      await effectiveTransaction.rollback();

      throw e;
    }

    this.afterHandleCockroachIndex();

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

  async createTable(model: GraphQLModelsType, withoutForeignKey: boolean): Promise<void> {
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

    updateIndexesName(model.name, indexes, existedIndexes as string[]);
    // Update index query for cockroach db
    this.beforeHandleCockroachIndex(this.schemaName, model.name, indexes, existedIndexes as string[]);

    const sequelizeModel = this.storeService.defineModel(model, attributes, indexes, this.schemaName);

    this.mainQueries.push(...generateCreateTableStatement(sequelizeModel, this.schemaName, withoutForeignKey));

    // TODO double check if this is getting picked up by the indexes methods
    if (sequelizeModel.options.indexes) {
      this.mainQueries.push(
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
    this.mainQueries.unshift(dropNotifyTrigger(this.schemaName, tableName));
    this.mainQueries.push(`DROP TABLE IF EXISTS "${this.schemaName}"."${tableName}";`);
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
    this.mainQueries.push(createColumnStatement(this.schemaName, dbTableName, dbColumnName, formattedAttributes));

    if (columnOptions.comment) {
      this.extraQueries.push(commentColumnQuery(this.schemaName, dbTableName, dbColumnName, columnOptions.comment));
    }

    this.addModelToSequelizeCache(sequelizeModel);
  }

  dropColumn(model: GraphQLModelsType, field: GraphQLEntityField): void {
    const columnName = formatColumnName(field.name);
    const tableName = modelToTableName(model.name);
    this.mainQueries.push(dropColumnStatement(this.schemaName, columnName, tableName));

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

    this.mainQueries.push(createIndexStatement(indexOptions, formattedTableName, this.schemaName));
  }

  dropIndex(model: GraphQLModelsType, index: GraphQLEntityIndex): void {
    const hashedIndexName = generateHashedIndexName(model.name, index);
    this.mainQueries.push(dropIndexStatement(this.schemaName, hashedIndexName));
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
          const rel = model.belongsTo(relatedModel, {foreignKey: relation.foreignKey});
          const fkConstraint = getFkConstraint(rel.source.tableName, rel.foreignKey);
          if (this.dbType !== SUPPORT_DB.cockRoach) {
            this.extraQueries.push(constraintDeferrableQuery(model.getTableName().toString(), fkConstraint));
          }
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
      if (relationQuery) {
        this.mainQueries.push(relationQuery);
      }
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

    this.mainQueries.unshift(dropRelationStatement(this.schemaName, tableName, fkConstraint));

    // TODO remove from sequelize model
    // Should update sequelize model cache
  }

  async createEnum(e: GraphQLEnumsType): Promise<void> {
    const queries: string[] = [];

    // Ref: https://www.graphile.org/postgraphile/enums/
    // Example query for enum name: COMMENT ON TYPE "polkadot-starter_enum_a40fe73329" IS E'@enum\n@enumName TestEnum'
    // It is difficult for sequelize use replacement, instead we use escape to avoid injection
    // UPDATE: this comment got syntax error with cockroach db, disable it for now. Waiting to be fixed.
    // See https://github.com/cockroachdb/cockroach/issues/44135
    const enumTypeName = enumNameToHash(e.name);
    let type = `"${this.schemaName}"."${enumTypeName}"`;
    let [results] = await this.sequelize.query(
      `SELECT pg_enum.enumlabel as enum_value
         FROM pg_type t JOIN pg_enum ON pg_enum.enumtypid = t.oid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
         WHERE t.typname = ? AND n.nspname = ? order by enumsortorder;`,
      {replacements: [enumTypeName, this.schemaName]}
    );

    const enumTypeNameDeprecated = `${this.schemaName}_enum_${enumNameToHash(e.name)}`;
    const resultsDeprecated = await getEnumDeprecated(this.sequelize, enumTypeNameDeprecated);
    if (resultsDeprecated.length !== 0) {
      results = resultsDeprecated;
      type = `"${enumTypeNameDeprecated}"`;
    }

    if (results.length === 0) {
      const escapedEnumValues = e.values.map((value) => this.sequelize.escape(value)).join(',');
      queries.unshift(createEnumStatement(type, escapedEnumValues));
    } else {
      const currentValues = results.map((v: any) => v.enum_value);

      // Make it a function to not execute potentially big joins unless needed
      if (!isEqual(e.values, currentValues)) {
        throw new Error(
          `\n * Can't modify enum "${e.name}" between runs: \n * Before: [${currentValues.join(
            `,`
          )}] \n * After : [${e.values.join(',')}] \n * You must rerun the project to do such a change`
        );
      }
    }
    if (this.dbType === SUPPORT_DB.cockRoach) {
      logger.warn(
        `Comment on enum ${e.description} is not supported with ${this.dbType}, enum name may display incorrectly in query service`
      );
    } else {
      const comment = this.sequelize.escape(
        `@enum\\n@enumName ${e.name}${e.description ? `\\n ${e.description}` : ''}`
      );

      queries.push(commentOnEnumStatement(type, comment));
    }
    this.mainQueries.unshift(...queries);
    this.enumTypeMap.set(e.name, type);
  }

  dropEnum(e: GraphQLEnumsType): void {
    const enumTypeValue = this.enumTypeMap?.get(e.name);
    if (enumTypeValue) {
      this.mainQueries.push(dropEumStatement(enumTypeValue));

      this.enumTypeMap.delete(e.name);
    }
  }

  // Sequelize model will generate follow query to create hash indexes
  // Example SQL:  CREATE INDEX "accounts_person_id" ON "polkadot-starter"."accounts" USING hash ("person_id")
  // This will be rejected from cockroach db due to syntax error
  // To avoid this we need to create index manually and add to extraQueries in order to create index in db
  private beforeHandleCockroachIndex(
    schema: string,
    modelName: string,
    indexes: IndexesOptions[],
    existedIndexes: string[]
  ): void {
    if (this.dbType !== SUPPORT_DB.cockRoach) {
      return;
    }
    indexes.forEach((index, i) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (index.using === IndexType.HASH && !existedIndexes.includes(index.name!)) {
        // TODO double check with idempotent on cockroach
        const cockroachDbIndexQuery = `CREATE INDEX "${index.name}" ON "${schema}"."${modelToTableName(modelName)}"(${
          index.fields
        }) USING HASH;`;
        this.extraQueries.push(cockroachDbIndexQuery);
        if (this.removedIndexes[modelName] === undefined) {
          this.removedIndexes[modelName] = [];
        }
        this.removedIndexes[modelName].push(indexes[i]);
        delete indexes[i];
      }
    });
  }

  // Due to we have removed hash index, it will be missing from the model, we need temp store it under `this.removedIndexes`
  // And force add back to the model use `afterHandleCockroachIndex()` after db is synced
  private afterHandleCockroachIndex(): void {
    if (this.dbType !== SUPPORT_DB.cockRoach) {
      return;
    }
    const removedIndexes = Object.entries(this.removedIndexes);
    if (removedIndexes.length > 0) {
      for (const [model, indexes] of removedIndexes) {
        const sqModel = this.sequelize.model(model);
        (sqModel as any)._indexes = (sqModel as any)._indexes.concat(indexes);
      }
    }
  }
}
