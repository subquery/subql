// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {getAllEntitiesRelations} from '@subql/utils';
import {ModelStatic, Sequelize} from '@subql/x-sequelize';
import {GraphQLSchema} from 'graphql';
import {getLogger} from '../../logger';
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

@Injectable()
export class SchemaMigrationService {
  constructor(
    private sequelize: Sequelize,
    private flushCache: (flushAll?: boolean) => Promise<void>,
    private updatedModels: (model: ModelStatic<any>[]) => void,
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
      allEnums: currentData.enums, // TODO this will need logic check, once Enum migration is enabled
    };

    compareEnums(currentData.enums, nextData.enums, changes);
    compareRelations(currentData.relations, nextData.relations, changes);
    compareModels(currentData.models, nextData.models, changes);

    return changes;
  }

  async run(currentSchema: GraphQLSchema, nextSchema: GraphQLSchema, blockHeight: number): Promise<void> {
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

    await this.flushCache(true);
    const migrationAction = await Migration.create(this.sequelize, this.dbSchema, nextSchema, this.config, logger);

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

      this.updatedModels(models);
    } catch (e: any) {
      logger.error(e, 'Failed to execute Schema Migration');
      throw e;
    }
  }
}
