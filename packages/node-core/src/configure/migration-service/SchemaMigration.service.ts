// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getAllEntitiesRelations} from '@subql/utils';
import {ModelStatic, Sequelize, Transaction} from '@subql/x-sequelize';
import {GraphQLSchema} from 'graphql';
import {StoreService} from '../../indexer';
import {getLogger} from '../../logger';
import {SmartTags} from '../../utils';
import {NodeConfig} from '../NodeConfig';
import {Migration} from './migration';
import {
  compareEnums,
  compareModels,
  compareRelations,
  hasChanged,
  schemaChangesLoggerMessage,
  SchemaChangesType,
} from './migration-helpers';

const logger = getLogger('SchemaMigrationService');

export class SchemaMigrationService {
  constructor(
    private sequelize: Sequelize,
    private storeService: StoreService,
    private flushCache: (flushAll?: boolean) => Promise<void>,
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
      allEnums: currentData.enums, // TODO support for Enum migration
    };

    compareEnums(currentData.enums, nextData.enums, changes);
    compareRelations(currentData.relations, nextData.relations, changes);
    compareModels(currentData.models, nextData.models, changes);

    return changes;
  }

  async run(
    currentSchema: GraphQLSchema,
    nextSchema: GraphQLSchema,
    transaction: Transaction | undefined
  ): Promise<ModelStatic<any>[] | void> {
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

    if (addedEnums.length > 0 || removedEnums.length > 0) {
      throw new Error('Schema Migration currently does not support Enum removal and creation');
    }

    await this.flushCache(true);
    const migrationAction = await Migration.create(
      this.sequelize,
      this.storeService,
      this.dbSchema,
      nextSchema,
      this.config,
      logger
    );

    logger.info(`${schemaChangesLoggerMessage(schemaDifference)}`);

    try {
      if (removedModels.length) {
        for (const model of removedModels) {
          migrationAction.dropTable(model);
        }
      }

      if (addedModels.length) {
        for (const model of addedModels) {
          await migrationAction.createTable(model);
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

      if (addedRelations.length) {
        const foreignKeyMap = new Map<string, Map<string, SmartTags>>();

        for (const relationModel of addedRelations) {
          migrationAction.createRelation(relationModel, foreignKeyMap);
        }
        // Comments should be added after
        migrationAction.addRelationComments(foreignKeyMap);
      }

      if (removedRelations.length) {
        for (const relationModel of removedRelations) {
          migrationAction.dropRelation(relationModel);
        }
      }

      return migrationAction.run(transaction);
    } catch (e: any) {
      logger.error(e, 'Failed to execute Schema Migration');
      throw e;
    }
  }
}
