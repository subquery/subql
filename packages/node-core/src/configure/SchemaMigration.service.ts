// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {
  blake2AsHex,
  getAllEntitiesRelations,
  getAllEnums,
  GraphQLEntityField,
  GraphQLEntityIndex,
  GraphQLEnumsType,
  GraphQLModelsType,
  GraphQLRelationsType,
  IndexType,
} from '@subql/utils';
import {
  Sequelize,
  ModelAttributes,
  ModelAttributeColumnOptions,
  DataType,
  DataTypes,
  StringDataType,
  Utils,
  Model,
  IndexesOptions,
  ModelStatic,
  Op,
  Transaction,
} from '@subql/x-sequelize';
import {GraphQLSchema, ObjectTypeDefinitionNode, parse, printSchema, visit, DefinitionNode, TypeNode} from 'graphql';
import {getLogger} from '../logger';
import {
  addBlockRangeColumnToIndexes,
  addHistoricalIdIndex,
  addIdAndBlockRangeAttributes,
  addScopeAndBlockHeightHooks,
  enumNameToHash,
  getColumnOption,
  getEnumDeprecated,
  getExistedIndexesQuery,
  modelsTypeToModelAttributes,
  updateIndexesName,
} from '../utils';
import {generateIndexName, modelToTableName} from '../utils/sequelizeUtil';

interface FieldDetailsType {
  fieldName: string;
  type: string; // Int, String... etc
  attributes: ModelAttributeColumnOptions;
}
export interface EntityChanges {
  addedFields: FieldDetailsType[];
  removedFields: FieldDetailsType[];
}

export interface SchemaChanges {
  addedEntities: {entityName: string; attributes: ModelAttributes}[];
  removedEntities: string[];
  modifiedEntities: Record<string, EntityChanges>;
}

const logger = getLogger('SchemaMigrationService');

export function extractTypeDetails(typeNode: TypeNode): {dataType: string; graphQLType: string} {
  let currentTypeNode: TypeNode = typeNode;

  while (currentTypeNode.kind === 'NonNullType' || currentTypeNode.kind === 'ListType') {
    currentTypeNode = currentTypeNode.type;
  }

  const name = currentTypeNode.kind === 'NamedType' ? currentTypeNode.name.value : '';

  return {graphQLType: currentTypeNode.kind, dataType: name};
}

// just a wrapper for naming confusion
function formatColumnName(columnName: string): string {
  return Utils.underscoredIf(columnName, true);
}

const sequelizeToPostgresTypeMap = {
  [DataTypes.STRING.name]: (dataType: DataType) => {
    const stringDataType = dataType as StringDataType;
    const length = stringDataType.options?.length;
    return length ? `VARCHAR(${length})` : 'TEXT';
  },
  [DataTypes.INTEGER.name]: () => 'INTEGER',
  [DataTypes.BIGINT.name]: () => 'BIGINT',
  [DataTypes.UUID.name]: () => 'UUID',
  [DataTypes.BOOLEAN.name]: () => 'BOOLEAN',
  [DataTypes.FLOAT.name]: () => 'FLOAT',
  [DataTypes.DATE.name]: () => 'TIMESTAMP',
  [DataTypes.JSONB.name]: () => 'JSONB',
};

function formatDataType(dataType: DataType): string {
  if (typeof dataType === 'string') {
    return dataType;
  } else {
    const formatter = sequelizeToPostgresTypeMap[dataType.key];
    return formatter(dataType);
  }
}

// This is required for creating columns
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
  // look into modifying relations, if possible or possible cases for it

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

  // removed models
  currentModels.forEach((model) => {
    if (!nextModelsMap.has(model.name)) {
      changes.removedModels.push(model);
    }
  });

  // added models
  nextModels.forEach((model) => {
    if (!currentModelsMap.has(model.name)) {
      changes.addedModels.push(model);
    }
  });

  // modified models
  nextModels.forEach((model) => {
    const currentModel = currentModelsMap.get(model.name);
    if (currentModel) {
      const addedFields = model.fields.filter((field) => !currentModel.fields.some((f) => fieldsAreEqual(f, field)));
      const removedFields = currentModel.fields.filter((field) => !model.fields.some((f) => fieldsAreEqual(f, field)));

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
  // TODO: If modifying exisiting column, index check is necessary to find all existing Index, if there are indexes in place, then we must reintroduce it

  // TODO add relationToMap

  // TODO add id and blockRange Attributes
  async run(
    currentSchema: GraphQLSchema,
    nextSchema: GraphQLSchema,
    dbSchema: string,
    blockHeight: number,
    _flushCache: (flushAll?: boolean) => Promise<void>,
    indexLimit: number
  ): Promise<void> {
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
    const {
      addedEnums,
      addedModels,
      addedRelations,
      allEnums,
      modifiedModels,
      removedEnums,
      removedModels,
      removedRelations,
    } = this.schemaComparator(currentSchema, nextSchema);

    // Log this out in terms of schema changes

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
      const enumTypeName = enumNameToHash(e.name);
      let type = `"${dbSchema}"."${enumTypeName}"`;
      const enumTypeNameDeprecated = `${dbSchema}_enum_${enumNameToHash(e.name)}`;
      const resultsDeprecated = await getEnumDeprecated(this.sequelize, enumTypeNameDeprecated);

      if (resultsDeprecated.length !== 0) {
        type = `"${enumTypeNameDeprecated}"`;
      }

      enumTypeMap.set(e.name, type);
    }

    try {
      if (addedEnums.length > 0 || removedEnums.length > 0) {
        throw new Error('Schema Migration currently does not support Enum removal and creation');
      }

      if (removedRelations.length > 0 || addedRelations.length > 0) {
        throw new Error('Schema Migration currently does not support Relational removal or creation');
      }

      // Remove should always occur before create
      if (removedModels.length) {
        for (const model of removedModels) {
          await this.dropTable(dbSchema, model.name, transaction);
        }
      }

      if (addedModels.length) {
        // TODO if the table has fields that is relational to another table that is yet to exist, that table should be created first
        for (const model of addedModels) {
          await this.createTable(dbSchema, model, enumTypeMap, blockHeight, transaction, indexLimit);
        }
      }

      if (Object.keys(modifiedModels).length) {
        const entities = Object.keys(modifiedModels);
        for (const model of entities) {
          const modelValue = modifiedModels[model];

          for (const field of modelValue.removedFields) {
            await this.dropColumn(dbSchema, model, field.name, transaction);
          }

          for (const field of modelValue.addedFields) {
            await this.createColumn(dbSchema, model, field, enumTypeMap, transaction);
          }
        }
      }

      await transaction.commit();
    } catch (e: any) {
      logger.error(e, 'Failed to execute Schema Migration');
      await transaction.rollback();
      throw new Error(e);
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
    transaction: Transaction,
    indexLimit: number
  ): Promise<void> {
    const attributes = modelsTypeToModelAttributes(model, enumTypeMap);
    const indexes = model.indexes.map(({fields, unique, using}) => ({
      fields: fields.map((field) => Utils.underscoredIf(field, true)),
      unique,
      using,
    }));

    if (indexes.length > indexLimit) {
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
      createdAt: true, // TODO PlaceHolders
      updatedAt: true, // TODO PlaceHolders
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
    indexName: string,
    columns: string[],
    unique = false,
    indexType: IndexType = IndexType.BTREE,
    transaction: Transaction
  ): Promise<void> {
    // TODO
  }

  private async dropIndex(schema: string, indexName: string, transaction: Transaction): Promise<void> {
    // TODO
  }
}
