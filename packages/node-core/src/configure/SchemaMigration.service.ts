// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {
  getAllEntitiesRelations,
  GraphQLEntityField,
  GraphQLEntityIndex,
  GraphQLEnumsType,
  GraphQLModelsType,
  GraphQLRelationsType,
} from '@subql/utils';
import {Model, ModelStatic, Sequelize} from '@subql/x-sequelize';
import {GraphQLSchema} from 'graphql';
import {getLogger} from '../logger';
import {Migration} from '../utils/migration';
import {NodeConfig} from './NodeConfig';

const logger = getLogger('SchemaMigrationService');

function schemaChangesLoggerMessage(schemaChanges: SchemaChangesType): string {
  let logMessage = '\n';

  const formatModels = (models: GraphQLModelsType[]) => models.map((model: GraphQLModelsType) => model.name).join(', ');
  const formatIndexes = (indexes: GraphQLEntityIndex[]) =>
    indexes
      .map(
        (index: GraphQLEntityIndex) =>
          `${index.fields.join(', ')}${index.unique ? ' (Unique)' : ''}${index.using ? ` Using: ${index.using}` : ''}`
      )
      .join('; ');

  if (schemaChanges.addedModels.length) {
    logMessage += `Added Entities: ${formatModels(schemaChanges.addedModels)}\n`;
  }

  if (schemaChanges.removedModels.length) {
    logMessage += `Removed Entities: ${formatModels(schemaChanges.removedModels)}\n`;
  }

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

      const addedIndexes = model.indexes.filter((index) => !currentModel.indexes.some((i) => indexesEqual(i, index)));
      const removedIndexes = currentModel.indexes.filter((index) => !model.indexes.some((i) => indexesEqual(i, index)));

      if (addedFields.length || removedFields.length || addedIndexes.length || removedIndexes.length) {
        changes.modifiedModels[model.name] = {
          model,
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
  return Object.values(changes).some((change) =>
    Array.isArray(change) ? change.length > 0 : Object.keys(change).length > 0
  );
}

@Injectable()
export class SchemaMigrationService {
  constructor(private sequelize: Sequelize) {}

  static validateSchemaChanges(currentSchema: GraphQLSchema, nextSchema: GraphQLSchema): boolean {
    const {modifiedModels, removedModels} = SchemaMigrationService.schemaComparator(currentSchema, nextSchema);
    if (removedModels.length > 0) return false;

    for (const {removedFields} of Object.values(modifiedModels)) {
      if (removedFields.length > 0) {
        return false;
      }
    }

    return true;
  }

  static schemaComparator(currentSchema: GraphQLSchema, nextSchema: GraphQLSchema): SchemaChangesType {
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

    compareEnums(currentData.enums, nextData.enums, changes);
    compareRelations(currentData.relations, nextData.relations, changes);
    compareModels(currentData.models, nextData.models, changes);

    return changes;
  }

  async run(
    currentSchema: GraphQLSchema,
    nextSchema: GraphQLSchema,
    dbSchema: string,
    blockHeight: number,
    _flushCache: (flushAll?: boolean) => Promise<void>,
    updateCacheModels: (model: ModelStatic<Model<any, any>>[]) => void,
    config: NodeConfig
  ): Promise<void> {
    const schemaDifference = SchemaMigrationService.schemaComparator(currentSchema, nextSchema);

    const {
      addedEnums,
      addedModels,
      addedRelations,
      allEnums, // TODO enum support
      modifiedModels,
      removedEnums,
      removedModels,
      removedRelations,
    } = schemaDifference;
    if (!hasChanged(schemaDifference)) {
      logger.info('No Schema changes');
      return;
    }

    const transaction = await this.sequelize.transaction();
    if (!transaction) {
      throw new Error('Failed to create transaction');
    }
    await _flushCache(true);
    const migrationAction = await Migration.create(this.sequelize, dbSchema, nextSchema, config, transaction, logger);

    logger.info(`${schemaChangesLoggerMessage(schemaDifference)}`);

    if (addedEnums.length > 0 || removedEnums.length > 0) {
      throw new Error('Schema Migration currently does not support Enum removal and creation');
    }

    if (removedRelations.length > 0 || addedRelations.length > 0) {
      throw new Error('Schema Migration currently does not support Relational removal or creation');
    }

    try {
      if (removedModels.length) {
        for (const model of removedModels) {
          migrationAction.dropTable(model);
        }
      }

      if (addedModels.length) {
        // TODO if the table has fields that is relational to another table that is yet to exist, that table should be created first
        for (const model of addedModels) {
          await migrationAction.createTable(model, blockHeight);
        }
      }

      if (Object.keys(modifiedModels).length) {
        const entities = Object.keys(modifiedModels);
        for (const model of entities) {
          const modelValue = modifiedModels[model];

          for (const index of modelValue.removedIndexes) {
            migrationAction.dropIndex(modelValue.model, index);
          }

          for (const field of modelValue.removedFields) {
            migrationAction.dropColumn(modelValue.model, field);
          }

          for (const field of modelValue.addedFields) {
            migrationAction.createColumn(modelValue.model, field);
          }

          for (const index of modelValue.addedIndexes) {
            migrationAction.createIndex(modelValue.model, index);
          }
        }
      }

      const models = await migrationAction.run();

      updateCacheModels(models);
    } catch (e: any) {
      logger.error(e, 'Failed to execute Schema Migration');
      throw e;
    }
  }
}
