// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getAllEntitiesRelations, GraphQLModelsType, GraphQLRelationsType} from '@subql/utils';
import {Sequelize, Transaction} from '@subql/x-sequelize';
import {GraphQLSchema} from 'graphql';
import {NodeConfig} from '../../configure';
import {cacheProviderFlushData, StoreService} from '../../indexer';
import {getLogger} from '../../logger';
import {sortModels} from '../sync-helper';
import {Migration} from './migration';
import {
  alignModelOrder,
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
    private dbSchema: string,
    private config: NodeConfig
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

  async run(currentSchema: GraphQLSchema | null, nextSchema: GraphQLSchema, transaction: Transaction): Promise<void> {
    logger.info('Running schema migration');
    console.log('WTF');
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

    const sortedSchemaModels = this.orderModelsByRelations(
      getAllEntitiesRelations(nextSchema).models,
      getAllEntitiesRelations(nextSchema).relations
    );

    const sortedAddedModels = alignModelOrder<GraphQLModelsType[]>(sortedSchemaModels, addedModels);
    const sortedModifiedModels = alignModelOrder<ModifiedModels>(sortedSchemaModels, modifiedModels);

    await cacheProviderFlushData(this.storeService.modelProvider, true);

    const migrationAction = await Migration.create(this.sequelize, this.storeService, this.dbSchema, this.config);

    if (this.config.debug) {
      logger.debug(`${schemaChangesLoggerMessage(schemaDifference)}`);
    }

    try {
      for (const enumValue of addedEnums) {
        migrationAction.createEnum(enumValue);
      }

      for (const enumValue of modifiedEnums) {
        migrationAction.modifyEnum(enumValue);
      }

      for (const model of removedModels) {
        migrationAction.dropTable(model);
      }

      for (const model of sortedAddedModels) {
        await migrationAction.createTable(model, this.withoutForeignKeys);
      }

      const entities = Object.keys(sortedModifiedModels);
      for (const model of entities) {
        const modelValue = sortedModifiedModels[model];

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

        if (modelValue.removedFullText) {
          migrationAction.dropFullText(modelValue.model);
        }

        if (modelValue.addedFullText) {
          migrationAction.createFullText(modelValue.model);
        }
      }

      for (const relationModel of addedRelations) {
        migrationAction.createRelation(relationModel);
      }

      for (const relationModel of removedRelations) {
        migrationAction.dropRelation(relationModel);
      }
      for (const enumValue of removedEnums) {
        migrationAction.dropEnum(enumValue);
      }

      const modelChanges = await migrationAction.run(transaction);

      this.storeService.updateModels(modelChanges, getAllEntitiesRelations(nextSchema));

      await cacheProviderFlushData(this.storeService.modelProvider, true);
    } catch (e: any) {
      logger.error(e, 'Failed to execute Schema Migration');
      throw e;
    }
  }
}
