// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'node:assert';
import {SUPPORT_DB} from '@subql/common';
import {
  GraphQLEntityField,
  GraphQLEntityIndex,
  GraphQLEnumsType,
  GraphQLModelsType,
  GraphQLRelationsType,
  hashName,
  IndexType,
} from '@subql/utils';
import {
  IndexesOptions,
  ModelAttributes,
  ModelStatic,
  QueryTypes,
  Sequelize,
  Transaction,
  Utils,
} from '@subql/x-sequelize';
import {isEqual, uniq} from 'lodash';
import {NodeConfig} from '../../configure/NodeConfig';
import {StoreService} from '../../indexer';
import {getLogger} from '../../logger';
import {EnumType, getColumnOption, modelsTypeToModelAttributes} from '../../utils';
import {formatAttributes, formatColumnName, modelToTableName} from '../sequelizeUtil';
import * as syncHelper from '../sync-helper';

type RemovedIndexes = Record<string, IndexesOptions[]>;

const logger = getLogger('db-manager');

export class Migration {
  /* Models that are added or modified during the migration */
  private modifiedModels: ModelStatic<any>[] = [];
  private removedModels: string[] = [];
  /*
  mainQueries are used for executions, that are not reliant on any prior db operations
  extraQueries are executions, that are reliant on certain db operations, e.g. comments on foreignKeys or comments on tables, should be executed only after the table has been created
   */
  private mainQueries: syncHelper.QueryString[] = [];
  private extraQueries: syncHelper.QueryString[] = [];
  private readonly historical: boolean;
  private readonly useSubscription: boolean;
  private foreignKeyMap: Map<string, Map<string, syncHelper.SmartTags>> = new Map<
    string,
    Map<string, syncHelper.SmartTags>
  >();
  private enumTypeMap: Map<string, EnumType>;
  private removedIndexes: RemovedIndexes = {};

  private constructor(
    private sequelize: Sequelize,
    private storeService: StoreService,
    private readonly schemaName: string,
    private readonly config: NodeConfig,
    private readonly dbType: SUPPORT_DB,
    private readonly existingForeignKeys: string[], // this the source of truth from the db
    private initEnumTypeMap: Map<string, EnumType>,
    private existingIndexes: {indexname: string}[]
  ) {
    // We can use store historical here, as long as
    // store.initCoreTables checked historical status, then store.init called syncSchema then migration run
    this.historical = storeService.historical;
    this.useSubscription = config.subscription;

    if (this.useSubscription && dbType === SUPPORT_DB.cockRoach) {
      this.useSubscription = false;
      logger.warn(`Subscription is not support with ${this.dbType}`);
    }

    this.enumTypeMap = this.initEnumTypeMap;

    if (this.useSubscription) {
      this.extraQueries.push(syncHelper.createSendNotificationTriggerFunction(schemaName));
    }
  }

  static async create(
    sequelize: Sequelize,
    storeService: StoreService,
    schemaName: string,
    config: NodeConfig,
    dbType: SUPPORT_DB
  ): Promise<Migration> {
    const existingForeignKeys = await syncHelper.getExistingForeignKeys(schemaName, sequelize);
    const enumTypeMap = await syncHelper.getExistingEnums(schemaName, sequelize);
    const indexesResult = (await sequelize.query(syncHelper.getExistedIndexesQuery(schemaName), {
      type: QueryTypes.SELECT,
    })) as {
      indexname: string;
    }[];
    return new Migration(
      sequelize,
      storeService,
      schemaName,
      config,
      dbType,
      existingForeignKeys,
      enumTypeMap,
      indexesResult
    );
  }

  async run(transaction?: Transaction): Promise<{modifiedModels: ModelStatic<any>[]; removedModels: string[]}> {
    const effectiveTransaction = transaction ?? (await this.sequelize.transaction());

    if (this.historical) {
      // Comments should be added after
      this.addRelationComments();
    }

    try {
      for (const query of this.mainQueries) {
        if (syncHelper.isQuery(query)) {
          await this.sequelize.query(query.sql, {replacements: query.replacements, transaction: effectiveTransaction});
        } else {
          await this.sequelize.query(query, {transaction: effectiveTransaction});
        }
      }

      for (const query of uniq(this.extraQueries)) {
        if (syncHelper.isQuery(query)) {
          await this.sequelize.query(query.sql, {replacements: query.replacements, transaction: effectiveTransaction});
        } else {
          await this.sequelize.query(query, {transaction: effectiveTransaction});
        }
      }

      await effectiveTransaction.commit();
    } catch (e) {
      await effectiveTransaction.rollback();

      throw e;
    }

    this.afterHandleCockroachIndex();

    return {
      modifiedModels: this.modifiedModels,
      removedModels: this.removedModels,
    };
  }

  private prepareModelAttributesAndIndexes(model: GraphQLModelsType): {
    attributes: ModelAttributes<any>;
    indexes: IndexesOptions[];
  } {
    const attributes = modelsTypeToModelAttributes(model, this.enumTypeMap, this.schemaName);
    if (this.historical) {
      syncHelper.addIdAndBlockRangeAttributes(attributes);
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
    if (!this.modifiedModels.find((m) => m.name === modelName)) {
      this.modifiedModels.push(sequelizeModel);
    }
  }

  private createSequelizeModel(model: GraphQLModelsType): ModelStatic<any> {
    const {attributes, indexes} = this.prepareModelAttributesAndIndexes(model);
    return this.storeService.defineModel(model, attributes, indexes, this.schemaName);
  }

  async createTable(model: GraphQLModelsType, withoutForeignKey: boolean): Promise<void> {
    const {attributes, indexes} = this.prepareModelAttributesAndIndexes(model);
    const existedIndexes = this.existingIndexes.map((i) => (i as any).indexname);

    if (indexes.length > this.config.indexCountLimit) {
      throw new Error(`too many indexes on entity ${model.name}`);
    }

    if (this.historical) {
      syncHelper.addBlockRangeColumnToIndexes(indexes);
      syncHelper.addHistoricalIdIndex(model, indexes);
    }

    syncHelper.updateIndexesName(model.name, indexes, existedIndexes as string[]);
    // Update index query for cockroach db
    this.beforeHandleCockroachIndex(model.name, indexes, existedIndexes as string[]);

    const sequelizeModel = this.storeService.defineModel(model, attributes, indexes, this.schemaName);

    this.mainQueries.push(...syncHelper.generateCreateTableQuery(sequelizeModel, this.schemaName, withoutForeignKey));

    if (sequelizeModel.options.indexes) {
      this.mainQueries.push(
        ...syncHelper.generateCreateIndexQuery(
          sequelizeModel.options.indexes,
          this.schemaName,
          sequelizeModel.tableName
        )
      );
    }

    if (model.fullText) {
      this.createFullText(model);
    }

    if (this.useSubscription) {
      const triggerName = hashName(this.schemaName, 'notify_trigger', sequelizeModel.tableName);
      const notifyTriggers = await syncHelper.getTriggers(this.sequelize, triggerName);
      // Triggers not been found
      if (notifyTriggers.length === 0) {
        this.extraQueries.push(syncHelper.createNotifyTrigger(this.schemaName, sequelizeModel.tableName));
      } else {
        syncHelper.validateNotifyTriggers(triggerName, notifyTriggers as syncHelper.NotifyTriggerPayload[]);
      }
    } else {
      //TODO: DROP TRIGGER IF EXIST is not valid syntax for cockroach, better check trigger exist at first.
      if (this.dbType !== SUPPORT_DB.cockRoach) {
        // trigger drop should be prioritized
        this.extraQueries.unshift(syncHelper.dropNotifyTrigger(this.schemaName, sequelizeModel.tableName));
      }
    }

    if (!this.useSubscription && this.dbType !== SUPPORT_DB.cockRoach) {
      this.extraQueries.push(syncHelper.dropNotifyFunction(this.schemaName));
    }

    this.addModelToSequelizeCache(sequelizeModel);
  }

  dropTable(model: GraphQLModelsType): void {
    const tableName = modelToTableName(model.name);

    // should prioritise dropping the triggers
    this.mainQueries.unshift(syncHelper.dropNotifyTrigger(this.schemaName, tableName));
    this.mainQueries.push(`DROP TABLE IF EXISTS "${this.schemaName}"."${tableName}";`);
    this.removedModels.push(model.name);
  }

  createColumn(model: GraphQLModelsType, field: GraphQLEntityField): void {
    const sequelizeModel = this.createSequelizeModel(model);

    const columnOptions = getColumnOption(field, this.enumTypeMap, this.schemaName);
    if (columnOptions.primaryKey) {
      throw new Error('Primary Key migration upgrade is not allowed');
    }

    if (!columnOptions.allowNull) {
      throw new Error(`Non-nullable field creation is not supported: ${field.name} on ${model.name}`);
    }

    const dbTableName = modelToTableName(model.name);
    const dbColumnName = formatColumnName(field.name);

    const formattedAttributes = formatAttributes(columnOptions, this.schemaName, false);
    this.mainQueries.push(
      syncHelper.createColumnQuery(this.schemaName, dbTableName, dbColumnName, formattedAttributes)
    );

    if (columnOptions.comment) {
      this.extraQueries.push(
        syncHelper.commentColumnQuery(this.schemaName, dbTableName, dbColumnName, columnOptions.comment)
      );
    }

    this.addModelToSequelizeCache(sequelizeModel);
  }

  dropColumn(model: GraphQLModelsType, field: GraphQLEntityField): void {
    const columnName = formatColumnName(field.name);
    const tableName = modelToTableName(model.name);
    this.mainQueries.push(syncHelper.dropColumnQuery(this.schemaName, columnName, tableName));
    this.addModelToSequelizeCache(this.createSequelizeModel(model));
  }

  createIndex(model: GraphQLModelsType, index: GraphQLEntityIndex): void {
    const formattedTableName = modelToTableName(model.name);
    const indexOptions: IndexesOptions = {...index, fields: index.fields.map((f) => formatColumnName(f))};

    if (this.historical) {
      syncHelper.addBlockRangeColumnToIndexes([indexOptions]);
      syncHelper.addHistoricalIdIndex(model, [indexOptions]);
    }

    indexOptions.name = syncHelper.generateHashedIndexName(model.name, indexOptions);

    this.mainQueries.push(syncHelper.createIndexQuery(indexOptions, formattedTableName, this.schemaName));
  }

  dropIndex(model: GraphQLModelsType, index: GraphQLEntityIndex): void {
    const hashedIndexName = syncHelper.generateHashedIndexName(model.name, index);
    this.mainQueries.push(syncHelper.dropIndexQuery(this.schemaName, hashedIndexName));
  }

  createRelation(relation: GraphQLRelationsType): void {
    const model = this.sequelize.model(relation.from);
    const relatedModel = this.sequelize.model(relation.to);
    if (this.historical) {
      syncHelper.addRelationToMap(relation, this.foreignKeyMap, model, relatedModel);
    } else {
      switch (relation.type) {
        case 'belongsTo': {
          model.belongsTo(relatedModel, {foreignKey: relation.foreignKey});
          syncHelper.addRelationToMap(relation, this.foreignKeyMap, model, relatedModel);
          const rel = model.belongsTo(relatedModel, {foreignKey: relation.foreignKey});
          const fkConstraint = syncHelper.getFkConstraint(rel.source.tableName, rel.foreignKey);
          if (this.existingForeignKeys.includes(fkConstraint)) break;
          if (this.dbType !== SUPPORT_DB.cockRoach) {
            this.extraQueries.push(syncHelper.constraintDeferrableQuery(model.getTableName().toString(), fkConstraint));
          }
          break;
        }
        case 'hasOne': {
          const rel = model.hasOne(relatedModel, {
            foreignKey: relation.foreignKey,
          });
          const fkConstraint = syncHelper.getFkConstraint(rel.target.tableName, rel.foreignKey);
          if (this.existingForeignKeys.includes(fkConstraint)) break;
          const tags = syncHelper.smartTags({
            singleForeignFieldName: relation.fieldName,
          });
          this.extraQueries.push(
            syncHelper.commentConstraintQuery(this.schemaName, rel.target.tableName, fkConstraint, tags),
            syncHelper.createUniqueIndexQuery(this.schemaName, relatedModel.tableName, relation.foreignKey)
          );
          break;
        }
        case 'hasMany': {
          const rel = model.hasMany(relatedModel, {
            foreignKey: relation.foreignKey,
          });
          const fkConstraint = syncHelper.getFkConstraint(rel.target.tableName, rel.foreignKey);
          if (this.existingForeignKeys.includes(fkConstraint)) break;
          const tags = syncHelper.smartTags({
            foreignFieldName: relation.fieldName,
          });
          this.extraQueries.push(
            syncHelper.commentConstraintQuery(this.schemaName, rel.target.tableName, fkConstraint, tags)
          );
          break;
        }
        default:
          throw new Error('Relation type is not supported');
      }
      const relationQuery = syncHelper.generateForeignKeyQuery(
        model.getAttributes()[relation.foreignKey],
        model.tableName
      );
      if (relationQuery) {
        this.mainQueries.push(relationQuery);
      }
    }

    this.addModelToSequelizeCache(model);
  }

  private addRelationComments(): void {
    this.foreignKeyMap.forEach((keys, tableName) => {
      const comment = Array.from(keys.values())
        .map((tags) => syncHelper.smartTags(tags, '|'))
        .join('\n');
      const query = syncHelper.commentTableQuery(this.schemaName, tableName, comment);
      this.extraQueries.push(query);
    });
  }

  dropRelation(relation: GraphQLRelationsType): void {
    if (relation.type !== 'belongsTo') {
      return;
    }
    const tableName = modelToTableName(relation.from);
    const fkConstraint = syncHelper.getFkConstraint(tableName, relation.foreignKey);

    this.mainQueries.unshift(syncHelper.dropRelationQuery(this.schemaName, tableName, fkConstraint));
  }

  createEnum(e: GraphQLEnumsType): void {
    const queries: string[] = [];

    // Ref: https://www.graphile.org/postgraphile/enums/
    // Example query for enum name: COMMENT ON TYPE "polkadot-starter_enum_a40fe73329" IS E'@enum\n@enumName TestEnum'
    // It is difficult for sequelize use replacement, instead we use escape to avoid injection
    // UPDATE: this comment got syntax error with cockroach db, disable it for now. Waiting to be fixed.
    // See https://github.com/cockroachdb/cockroach/issues/44135
    const enumTypeName = syncHelper.enumNameToHash(e.name);
    const enumTypeNameDeprecated = `${this.schemaName}_enum_${syncHelper.enumNameToHash(e.name)}`;

    let type: string | null = null;

    const typeNames = [enumTypeName, enumTypeNameDeprecated];

    typeNames.forEach((t) => {
      if (this.enumTypeMap.has(t)) {
        const enumFromMapValues = this.enumTypeMap.get(t)?.enumValues;
        if (!isEqual(e.values, enumFromMapValues)) {
          throw new Error(
            `\n * Can't modify enum "${e.name}" between runs: \n * Before: [${enumFromMapValues?.join(
              `,`
            )}] \n * After : [${e.values.join(',')}] \n * You must rerun the project to do such a change`
          );
        }
        type = t === enumTypeNameDeprecated ? `"${t}"` : `"${this.schemaName}"."${enumTypeName}"`;
      }
    });

    if (!type) {
      type = `"${this.schemaName}"."${enumTypeName}"`;
      const escapedEnumValues = e.values.map((value) => this.sequelize.escape(value)).join(',');
      queries.unshift(syncHelper.createEnumQuery(type, escapedEnumValues));
    }

    if (this.dbType === SUPPORT_DB.cockRoach) {
      logger.warn(
        `Comment on enum ${e.description} is not supported with ${this.dbType}, enum name may display incorrectly in query service`
      );
    } else {
      const comment = this.sequelize.escape(
        `@enum\\n@enumName ${e.name}${e.description ? `\\n ${e.description}` : ''}`
      );

      queries.push(syncHelper.commentOnEnumQuery(type, comment));
    }
    this.mainQueries.unshift(...queries);
    this.enumTypeMap.set(enumTypeName, {
      enumValues: e.values,
      type: type,
      name: e.name,
    });
  }

  dropEnum(e: GraphQLEnumsType): void {
    const enumTypeName = syncHelper.enumNameToHash(e.name);
    const enumTypeNameDeprecated = `${this.schemaName}_enum_${syncHelper.enumNameToHash(e.name)}`;

    [enumTypeName, enumTypeNameDeprecated].forEach((typeName) => {
      if (this.enumTypeMap.has(typeName)) {
        this.mainQueries.push(syncHelper.dropEnumQuery(typeName, this.schemaName));
        this.enumTypeMap.delete(typeName);
      }
    });
  }

  createFullText(model: GraphQLModelsType): void {
    assert(model.fullText, `Expected fullText to exist on model ${model.name}`);

    const table = modelToTableName(model.name);

    const queries = [
      syncHelper.createTsVectorColumnQuery(this.schemaName, table, model.fullText.fields, model.fullText.language),
      syncHelper.createTsVectorCommentQuery(this.schemaName, table),
      syncHelper.createTsVectorIndexQuery(this.schemaName, table),
      syncHelper.createSearchFunctionQuery(this.schemaName, table),
      syncHelper.commentSearchFunctionQuery(this.schemaName, table),
    ];

    this.mainQueries.push(...queries);
  }

  dropFullText(model: GraphQLModelsType): void {
    const table = modelToTableName(model.name);

    const queries = [
      syncHelper.dropSearchFunctionQuery(this.schemaName, table),
      syncHelper.dropTsVectorIndexQuery(this.schemaName, table),
      syncHelper.dropTsVectorColumnQuery(this.schemaName, table),
    ];

    this.mainQueries.push(...queries);
  }

  // Sequelize model will generate follow query to create hash indexes
  // Example SQL:  CREATE INDEX "accounts_person_id" ON "polkadot-starter"."accounts" USING hash ("person_id")
  // This will be rejected from cockroach db due to syntax error
  // To avoid this we need to create index manually and add to extraQueries in order to create index in db
  private beforeHandleCockroachIndex(modelName: string, indexes: IndexesOptions[], existedIndexes: string[]): void {
    if (this.dbType !== SUPPORT_DB.cockRoach) {
      return;
    }
    indexes.forEach((index, i) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (index.using === IndexType.HASH && !existedIndexes.includes(index.name!)) {
        // TODO double check with idempotent on cockroach
        const cockroachDbIndexQuery = `CREATE INDEX "${index.name}" ON "${this.schemaName}"."${modelToTableName(
          modelName
        )}"(${index.fields}) USING HASH;`;
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
