// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SUPPORT_DB} from '@subql/common';
import {
  getAllEntitiesRelations,
  GraphQLModelsRelationsEnums,
  GraphQLModelsType,
  GraphQLRelationsType,
} from '@subql/utils';
import {ModelStatic, Sequelize, Transaction} from '@subql/x-sequelize';
import {GraphQLSchema} from 'graphql';
import {StoreService} from '../../indexer';
import {getLogger} from '../../logger';
import {sortModels} from '../../utils';
import {NodeConfig} from '../NodeConfig';
import {Migration} from './migration';
import {
  compareEnums,
  compareModels,
  compareRelations,
  hasChanged,
  ModifiedModels,
  schemaChangesLoggerMessage,
  SchemaChangesType,
} from './migration-helpers';

const logger = getLogger('SchemaMigrationService');

export class SchemaMigrationService {
  private withoutForeignKeys = false;

  constructor(
    private sequelize: Sequelize,
    private storeService: StoreService,
    private flushCache: (flushAll?: boolean) => Promise<void>,
    private dbSchema: string,
    private config: NodeConfig,
    private dbType: SUPPORT_DB = SUPPORT_DB.postgres
  ) {}

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

  static schemaComparator(currentSchema: GraphQLSchema | null, nextSchema: GraphQLSchema): SchemaChangesType {
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
      modifiedEnums: [],
    };

    compareEnums(currentData.enums, nextData.enums, changes);
    compareRelations(currentData.relations, nextData.relations, changes);
    compareModels(currentData.models, nextData.models, changes);

    return changes;
  }

  private orderModelsByRelations(models: GraphQLModelsType[], relations: GraphQLRelationsType[]): GraphQLModelsType[] {
    const sortedModels = sortModels(relations, models);
    if (sortedModels === null) {
      this.withoutForeignKeys = true;
      return models;
    } else {
      this.withoutForeignKeys = false;
      return sortedModels.reverse();
    }
  }

  private alignModelOrder(
    schemaModels: GraphQLModelsType[],
    models: GraphQLModelsType[] | ModifiedModels
  ): GraphQLModelsType[] | ModifiedModels {
    const orderIndex = schemaModels.reduce((acc: Record<string, number>, model, index) => {
      acc[model.name] = index;
      return acc;
    }, {});

    if (Array.isArray(models)) {
      return models.sort((a, b) => {
        const indexA = orderIndex[a.name] ?? Number.MAX_VALUE; // Place unknown models at the end
        const indexB = orderIndex[b.name] ?? Number.MAX_VALUE;
        return indexA - indexB;
      });
    } else {
      const modelNames = Object.keys(models);
      const sortedModelNames = modelNames.sort((a, b) => {
        const indexA = orderIndex[a] ?? Number.MAX_VALUE;
        const indexB = orderIndex[b] ?? Number.MAX_VALUE;
        return indexA - indexB;
      });

      const sortedModifiedModels: ModifiedModels = {};
      sortedModelNames.forEach((modelName) => {
        sortedModifiedModels[modelName] = models[modelName];
      });

      return sortedModifiedModels;
    }
  }

  // eslint-disable-next-line complexity
  async run(
    currentSchema: GraphQLSchema | null,
    nextSchema: GraphQLSchema,
    transaction: Transaction | undefined
  ): Promise<ModelStatic<any>[] | void> {
    const schemaDifference = SchemaMigrationService.schemaComparator(currentSchema, nextSchema);
    const {
      addedEnums,
      addedModels,
      addedRelations,
      modifiedEnums,
      modifiedModels,
      removedEnums,
      removedModels,
      removedRelations,
    } = schemaDifference;

    if (!hasChanged(schemaDifference)) {
      logger.info('No Schema changes');
      return;
    }

    if (modifiedEnums.length > 0) {
      throw new Error(
        `Modifying enums is currently not supported. Please revert the changes to the following enums: ${modifiedEnums
          .map((e) => e.name)
          .join(', ')}`
      );
    }

    const sortedSchemaModels = this.orderModelsByRelations(
      getAllEntitiesRelations(nextSchema).models,
      getAllEntitiesRelations(nextSchema).relations
    );

    const sortedAddedModels = this.alignModelOrder(sortedSchemaModels, addedModels) as GraphQLModelsType[];
    const sortedModifiedModels = this.alignModelOrder(sortedSchemaModels, modifiedModels);

    await this.flushCache(true);
    const migrationAction = await Migration.create(
      this.sequelize,
      this.storeService,
      this.dbSchema,
      nextSchema,
      currentSchema,
      this.config,
      logger,
      this.dbType
    );

    logger.info(`${schemaChangesLoggerMessage(schemaDifference)}`);
    try {
      if (addedEnums.length) {
        for (const enumValue of addedEnums) {
          await migrationAction.createEnum(enumValue);
        }
      }

      if (removedModels.length) {
        for (const model of removedModels) {
          migrationAction.dropTable(model);
        }
      }

      if (sortedAddedModels.length) {
        for (const model of sortedAddedModels) {
          await migrationAction.createTable(model, this.withoutForeignKeys);
        }
      }

      if (Object.keys(sortedModifiedModels).length) {
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

      if (addedRelations.length) {
        for (const relationModel of addedRelations) {
          migrationAction.createRelation(relationModel);
        }
        // Comments should be added after
        migrationAction.addRelationComments();
      }

      if (removedRelations.length) {
        for (const relationModel of removedRelations) {
          migrationAction.dropRelation(relationModel);
        }
      }
      if (removedEnums.length) {
        for (const enumValue of removedEnums) {
          migrationAction.dropEnums(enumValue);
        }
      }

      return migrationAction.run(transaction);
    } catch (e: any) {
      logger.error(e, 'Failed to execute Schema Migration');
      throw e;
    }
  }
}
