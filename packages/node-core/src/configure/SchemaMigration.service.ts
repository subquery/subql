// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {SUPPORT_DB} from '@subql/common';
import {
  BigInt,
  Boolean,
  DateObj,
  Float,
  getAllEntitiesRelations,
  GraphQLEntityField,
  GraphQLEntityIndex,
  GraphQLEnumsType,
  GraphQLModelsType,
  GraphQLRelationsType,
  ID,
  Int,
  Json,
  SequelizeTypes,
  String,
} from '@subql/utils';
import {
  DataType,
  DataTypes,
  IndexesOptions,
  ModelAttributeColumnOptions,
  ModelAttributes,
  QueryInterfaceIndexOptions,
  Sequelize,
  TableName,
  Transaction,
  Utils,
} from '@subql/x-sequelize';
import {SetRequired} from '@subql/x-sequelize/types/utils/set-required';
import {GraphQLSchema, TypeNode} from 'graphql';
import {getLogger} from '../logger';
import {
  addBlockRangeColumnToIndexes,
  addHistoricalIdIndex,
  addIdAndBlockRangeAttributes,
  addScopeAndBlockHeightHooks,
  generateHashedIndexName,
  getColumnOption,
  getExistedIndexesQuery,
  modelsTypeToModelAttributes,
  syncEnums,
  updateIndexesName,
} from '../utils';
import {modelToTableName} from '../utils/sequelizeUtil';
import {NodeConfig} from './NodeConfig';

const logger = getLogger('SchemaMigrationService');

// just a wrapper for naming confusion
function formatColumnName(columnName: string): string {
  return Utils.underscoredIf(columnName, true);
}

const sequelizeToPostgresTypeMap = {
  [DataTypes.STRING.name]: (dataType: DataType) => String.sequelizeType,
  [DataTypes.INTEGER.name]: () => Int.sequelizeType,
  [DataTypes.BIGINT.name]: () => BigInt.sequelizeType,
  [DataTypes.UUID.name]: () => ID.sequelizeType,
  [DataTypes.BOOLEAN.name]: () => Boolean.sequelizeType,
  [DataTypes.FLOAT.name]: () => Float.sequelizeType,
  [DataTypes.DATE.name]: () => DateObj.sequelizeType,
  [DataTypes.JSONB.name]: () => Json.sequelizeType,
};

function formatDataType(dataType: DataType): SequelizeTypes {
  if (typeof dataType === 'string') {
    return dataType;
  } else {
    const formatter = sequelizeToPostgresTypeMap[dataType.key];
    return formatter(dataType);
  }
}

function schemaChangesLoggerMessage(schemaChanges: SchemaChangesType): string {
  let logMessage = '\n';

  // Helper function to format model names
  const formatModels = (models: GraphQLModelsType[]) => models.map((model: GraphQLModelsType) => model.name).join(', ');
  const formatIndexes = (indexes: GraphQLEntityIndex[]) =>
    indexes
      .map(
        (index: GraphQLEntityIndex) =>
          `${index.fields.join(', ')}${index.unique ? ' (Unique)' : ''}${index.using ? ` Using: ${index.using}` : ''}`
      )
      .join('; ');

  // Adding models
  if (schemaChanges.addedModels.length) {
    logMessage += `Added Entities: ${formatModels(schemaChanges.addedModels)}\n`;
  }

  // Removing models
  if (schemaChanges.removedModels.length) {
    logMessage += `Removed Entities: ${formatModels(schemaChanges.removedModels)}\n`;
  }

  // Modified models
  Object.entries(schemaChanges.modifiedModels).forEach(([modelName, changes]) => {
    logMessage += `Modified Entities: ${modelName}\n`;

    if (changes.addedFields.length) {
      logMessage += `\tAdded Fields: ${changes.addedFields.map((field) => field.name).join(', ')}\n`;
    }
    if (changes.removedFields.length) {
      logMessage += `\tRemoved Fields: ${changes.removedFields.map((field) => field.name).join(', ')}\n`;
    }

    if (changes.addedIndexes.length) {
      logMessage += `\tAdded Indexes: ${formatIndexes(changes.addedIndexes)}\n`;
    }
    if (changes.removedIndexes.length) {
      logMessage += `\tRemoved Indexes: ${formatIndexes(changes.removedIndexes)}\n`;
    }
  });

  /*
  TODO currently unsupported migration actions

   // Adding relations
  if (schemaChanges.addedRelations.length) {
    logMessage += `Added Relations: ${formatModels(schemaChanges.addedRelations)}\n`;
  }

  // Removing relations
  if (schemaChanges.removedRelations.length) {
    logMessage += `Removed Relations: ${formatModels(schemaChanges.removedRelations)}\n`;
  }

  // Adding enums
  if (schemaChanges.addedEnums.length) {
    logMessage += `Added Enums: ${formatModels(schemaChanges.addedEnums)}\n`;
  }

  // Removing enums
  if (schemaChanges.removedEnums.length) {
    logMessage += `Removed Enums: ${formatModels(schemaChanges.removedEnums)}\n`;
  }
   */
  return logMessage;
}

function formatAttributes(columnOptions: ModelAttributeColumnOptions): string {
  const type = formatDataType(columnOptions.type);
  const allowNull = columnOptions.allowNull === false ? 'NOT NULL' : '';
  const primaryKey = columnOptions.primaryKey ? 'PRIMARY KEY' : '';
  const unique = columnOptions.unique ? 'UNIQUE' : '';
  const autoIncrement = columnOptions.autoIncrement ? 'AUTO_INCREMENT' : ''; //  PostgreSQL

  // TODO unsupported
  // const defaultValue = options.defaultValue ? `DEFAULT
  // TODO Support relational
  // const references = options.references ? formatReferences(options.references) :

  return `${type} ${allowNull} ${primaryKey} ${unique} ${autoIncrement}`.trim();
}

export interface SchemaChangesType {
  addedModels: GraphQLModelsType[];
  removedModels: GraphQLModelsType[];

  modifiedModels: Record<
    string,
    {
      model: GraphQLModelsType;
      addedFields: GraphQLEntityField[];
      removedFields: GraphQLEntityField[];

      addedIndexes: GraphQLEntityIndex[];
      removedIndexes: GraphQLEntityIndex[];
    }
  >;

  addedRelations: GraphQLRelationsType[];
  removedRelations: GraphQLRelationsType[];

  addedEnums: GraphQLEnumsType[];
  removedEnums: GraphQLEnumsType[];
  allEnums: GraphQLEnumsType[];
  // Enums are typically not "modified" in place in PostgreSQL, so no modifiedEnums field is needed
}
function compareEnums(currentEnums: GraphQLEnumsType[], nextEnums: GraphQLEnumsType[], changes: SchemaChangesType) {
  const currentEnumNames = new Set(currentEnums.map((e) => e.name));
  const nextEnumNames = new Set(nextEnums.map((e) => e.name));

  changes.addedEnums = nextEnums.filter((e) => !currentEnumNames.has(e.name));
  changes.removedEnums = currentEnums.filter((e) => !nextEnumNames.has(e.name));
}

function compareRelations(
  currentRelations: GraphQLRelationsType[],
  nextRelations: GraphQLRelationsType[],
  changes: SchemaChangesType
) {
  const relationKey = (relation: GraphQLRelationsType) =>
    `${relation.from}-${relation.to}-${relation.type}-${relation.foreignKey}`;

  const currentRelationsMap = new Map(currentRelations.map((rel) => [relationKey(rel), rel]));
  const nextRelationsMap = new Map(nextRelations.map((rel) => [relationKey(rel), rel]));

  // Identify added and removed relations
  nextRelations.forEach((rel) => {
    if (!currentRelationsMap.has(relationKey(rel))) {
      changes.addedRelations.push(rel);
    }
  });

  currentRelations.forEach((rel) => {
    if (!nextRelationsMap.has(relationKey(rel))) {
      changes.removedRelations.push(rel);
    }
  });

  // TODO How to handle modified relations
  nextRelations.forEach((nextRel) => {
    const currentRel = currentRelations.find(
      (currentRel) =>
        currentRel.from === nextRel.from && currentRel.to === nextRel.to && currentRel.type === nextRel.type
    );

    if (currentRel && currentRel.foreignKey !== nextRel.foreignKey) {
      // Logic to handle modified relations due to foreignKey changes
      // This could involve adding to a modifiedRelations array, or similar
    }
  });
}

function fieldsAreEqual(field1: GraphQLEntityField, field2: GraphQLEntityField): boolean {
  return (
    field1.name === field2.name &&
    field1.type === field2.type &&
    field1.nullable === field2.nullable &&
    field1.isArray === field2.isArray
  );
}

function compareModels(
  currentModels: GraphQLModelsType[],
  nextModels: GraphQLModelsType[],
  changes: SchemaChangesType
) {
  const currentModelsMap = new Map(currentModels.map((model) => [model.name, model]));
  const nextModelsMap = new Map(nextModels.map((model) => [model.name, model]));

  currentModels.forEach((model) => {
    if (!nextModelsMap.has(model.name)) {
      changes.removedModels.push(model);
    }
  });

  nextModels.forEach((model) => {
    if (!currentModelsMap.has(model.name)) {
      changes.addedModels.push(model);
    }
  });

  nextModels.forEach((model) => {
    const currentModel = currentModelsMap.get(model.name);
    if (currentModel) {
      const addedFields = model.fields.filter((field) => !currentModel.fields.some((f) => fieldsAreEqual(f, field)));
      const removedFields = currentModel.fields.filter((field) => !model.fields.some((f) => fieldsAreEqual(f, field)));

      // TODO different ordered indexes
      const addedIndexes = model.indexes.filter((index) => !currentModel.indexes.some((i) => indexesEqual(i, index)));
      const removedIndexes = currentModel.indexes.filter((index) => !model.indexes.some((i) => indexesEqual(i, index)));

      if (addedFields.length || removedFields.length || addedIndexes.length || removedIndexes.length) {
        changes.modifiedModels[model.name] = {
          model, // retain model to process enums
          addedFields,
          removedFields,
          addedIndexes,
          removedIndexes,
        };
      }
    }
  });
}

function indexesEqual(index1: GraphQLEntityIndex, index2: GraphQLEntityIndex): boolean {
  return (
    index1.fields.join(',') === index2.fields.join(',') &&
    index1.unique === index2.unique &&
    index1.using === index2.using
  );
}

function hasChanged(changes: SchemaChangesType): boolean {
  return Object.values(changes).every((change) =>
    Array.isArray(change) ? change.length > 0 : Object.keys(change).length > 0
  );
}

@Injectable()
export class SchemaMigrationService {
  constructor(private sequelize: Sequelize) {}

  schemaComparator(currentSchema: GraphQLSchema, nextSchema: GraphQLSchema): SchemaChangesType {
    const currentData = getAllEntitiesRelations(currentSchema);
    const nextData = getAllEntitiesRelations(nextSchema);

    const changes: SchemaChangesType = {
      addedModels: [],
      removedModels: [],
      modifiedModels: {},
      addedRelations: [],
      removedRelations: [],
      addedEnums: [],
      removedEnums: [],
      allEnums: currentData.enums, // TODO this will need logic check, once Enum migration is enabled
    };

    // Compare Enums
    compareEnums(currentData.enums, nextData.enums, changes);

    // Compare Relations
    compareRelations(currentData.relations, nextData.relations, changes);

    // Compare Models
    compareModels(currentData.models, nextData.models, changes);

    return changes;
  }

  async run(
    currentSchema: GraphQLSchema,
    nextSchema: GraphQLSchema,
    dbSchema: string,
    blockHeight: number,
    _flushCache: (flushAll?: boolean) => Promise<void>,
    config: NodeConfig
  ): Promise<void> {
    const schemaDifference = this.schemaComparator(currentSchema, nextSchema);

    const {
      addedEnums,
      addedModels,
      addedRelations,
      allEnums,
      modifiedModels,
      removedEnums,
      removedModels,
      removedRelations,
    } = schemaDifference;
    if (hasChanged(schemaDifference)) {
      logger.info('No Schema changes');
      return;
    }

    if (blockHeight < 1) {
      Object.values(modifiedModels).forEach(({addedFields, removedFields}) => {
        addedFields.forEach((addedField) => {
          const correspondingRemovedField = removedFields.find((removedField) => removedField.name === addedField.name);

          if (correspondingRemovedField && correspondingRemovedField.nullable && !addedField.nullable) {
            throw new Error(`Field ${addedField.name} was nullable but is being added as non-nullable.`);
          }
        });
      });
    }

    const transaction = await this.sequelize.transaction();
    if (!transaction) {
      throw new Error('Failed to create transaction');
    }
    await _flushCache(true);
    /*
    Currently Unsupported Schema Migration changes:
      add/remove enums
      add/remove relations
   */
    logger.info(`${schemaChangesLoggerMessage(schemaDifference)}`);
    /*
    SQL execution order:
    Drop table (this will also drop the Indexes on that Table),
    Create table
    // TODO Drop Enums
    // TODO Create Enums
    Drop Columns
    Add Column
    // TODO Add/Drop indexes
    // TODO Add Relations
     */

    const enumTypeMap = new Map<string, string>();

    for (const e of allEnums) {
      await syncEnums(this.sequelize, SUPPORT_DB.postgres, e, dbSchema, enumTypeMap, logger);
    }
    if (addedEnums.length > 0 || removedEnums.length > 0) {
      throw new Error('Schema Migration currently does not support Enum removal and creation');
    }

    if (removedRelations.length > 0 || addedRelations.length > 0) {
      throw new Error('Schema Migration currently does not support Relational removal or creation');
    }

    try {
      // Remove should always occur before create
      if (removedModels.length) {
        for (const model of removedModels) {
          await this.dropTable(dbSchema, model.name, transaction);
        }
      }

      if (addedModels.length) {
        // TODO if the table has fields that is relational to another table that is yet to exist, that table should be created first
        for (const model of addedModels) {
          await this.createTable(dbSchema, model, enumTypeMap, blockHeight, config, transaction);
        }
      }

      if (Object.keys(modifiedModels).length) {
        const entities = Object.keys(modifiedModels);
        for (const model of entities) {
          const modelValue = modifiedModels[model];

          for (const index of modelValue.removedIndexes) {
            await this.dropIndex(dbSchema, model, index, transaction);
          }

          for (const field of modelValue.removedFields) {
            await this.dropColumn(dbSchema, model, field.name, transaction);
          }

          for (const field of modelValue.addedFields) {
            await this.createColumn(dbSchema, model, field, enumTypeMap, transaction);
          }

          for (const index of modelValue.addedIndexes) {
            await this.createIndex(
              dbSchema,
              model,
              {...index, fields: index.fields.map((f) => formatColumnName(f))},
              transaction
            );
          }
        }
      }

      await transaction.commit();
    } catch (e: any) {
      logger.error(e, 'Failed to execute Schema Migration');
      await transaction.rollback();
      throw e;
    }
  }

  private async createColumn(
    schema: string,
    tableName: string,
    field: GraphQLEntityField,
    enums: Map<string, string>,
    transaction: Transaction
  ): Promise<void> {
    const columnOptions = getColumnOption(field, enums);
    if (columnOptions.primaryKey) {
      throw new Error('Primary Key migration upgrade is not allowed');
    }
    const dbTableName = modelToTableName(tableName);
    const dbColumnName = formatColumnName(field.name);

    const formattedAttributes = formatAttributes(columnOptions);
    await this.sequelize.query(
      `ALTER TABLE "${schema}"."${dbTableName}" ADD COLUMN "${dbColumnName}" ${formattedAttributes};`,
      {transaction}
    );

    // Comments needs to be executed after column creation
    if (columnOptions.comment) {
      await this.sequelize.query(
        `COMMENT ON COLUMN "${schema}".${dbTableName}.${dbColumnName} IS '${columnOptions.comment}';`,
        {transaction}
      );
    }
  }

  private async dropColumn(
    schema: string,
    tableName: string,
    columnName: string,
    transaction: Transaction
  ): Promise<void> {
    await this.sequelize.query(
      `ALTER TABLE  "${schema}"."${modelToTableName(tableName)}" DROP COLUMN IF EXISTS ${formatColumnName(
        columnName
      )};`,
      {transaction}
    );
  }
  private async createTable(
    schema: string,
    model: GraphQLModelsType,
    enumTypeMap: Map<string, string>,
    blockHeight: number,
    config: NodeConfig,
    transaction: Transaction
  ): Promise<void> {
    const attributes = modelsTypeToModelAttributes(model, enumTypeMap);
    const indexes = model.indexes.map(({fields, unique, using}) => ({
      fields: fields.map((field) => Utils.underscoredIf(field, true)),
      unique,
      using,
    }));

    if (indexes.length > config.indexCountLimit) {
      throw new Error(`too many indexes on entity ${model.name}`);
    }

    const [indexesResult] = await this.sequelize.query(getExistedIndexesQuery(schema));
    const existedIndexes = indexesResult.map((i) => (i as any).indexname);

    // Historical should be enabled to use projectUpgrade
    addIdAndBlockRangeAttributes(attributes);
    addBlockRangeColumnToIndexes(indexes);
    addHistoricalIdIndex(model, indexes);

    const sequelizeModel = this.sequelize.define(model.name, attributes, {
      underscored: true,
      comment: model.description,
      freezeTableName: false,
      createdAt: config.timestampField,
      updatedAt: config.timestampField,
      schema,
      indexes,
    });
    updateIndexesName(model.name, indexes, existedIndexes);
    addScopeAndBlockHeightHooks(sequelizeModel, blockHeight);
    // TODO cockroach compatibility
    // TODO Subscription compatibility

    // TODO Support relational
    // How do i add transaction to sync ? or if Sync is the correct method to use
    await sequelizeModel.sync();
  }

  private async dropTable(schema: string, tableName: string, transaction: Transaction): Promise<void> {
    await this.sequelize.query(`DROP TABLE IF EXISTS "${schema}"."${modelToTableName(tableName)}";`, {transaction});
  }

  private async createIndex(
    schema: string,
    tableName: string,
    indexOptions: IndexesOptions,
    transaction: Transaction
  ): Promise<void> {
    const formattedTableName = modelToTableName(tableName);

    indexOptions.name = generateHashedIndexName(tableName, indexOptions);

    if (!indexOptions.fields || indexOptions.fields.length === 0) {
      throw new Error("The 'fields' property is required and cannot be empty.");
    }

    const options = {
      ...indexOptions,
      transaction,
    } as SetRequired<QueryInterfaceIndexOptions, 'fields'>;

    const tableNameObj: TableName = {tableName: formattedTableName, schema};

    await this.sequelize.getQueryInterface().addIndex(tableNameObj, options);
  }

  private async dropIndex(
    schema: string,
    tableName: string,
    indexOption: IndexesOptions,
    transaction: Transaction
  ): Promise<void> {
    const hashedIndexName = generateHashedIndexName(tableName, indexOption);
    await this.sequelize.query(`DROP INDEX IF EXISTS "${schema}"."${hashedIndexName}"`, {transaction});
  }
}
