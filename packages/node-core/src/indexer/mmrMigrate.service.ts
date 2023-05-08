// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {existsSync} from 'fs';
import {DEFAULT_WORD_SIZE} from '@subql/common';
import {NodeConfig, getExistingProjectSchema, getLogger, PgBasedMMRDB} from '@subql/node-core';
import {FileBasedDb} from '@subql/x-merkle-mountain-range';
import {Logging, QueryTypes, Sequelize} from 'sequelize';

const logger = getLogger('mmr-migrate');

export enum MMRMigrateErrorCode {
  SchemaCreationError = 'SCHEMA_CREATION_ERROR',
  MMRFileNotFoundError = 'MMR_FILE_NOT_FOUND_ERROR',
}

export interface MMRMigrateErrorContext {
  [key: string]: any;
}

export class MMRMigrateError extends Error {
  readonly code: MMRMigrateErrorCode;
  readonly context?: MMRMigrateErrorContext;

  constructor(message: string, code: MMRMigrateErrorCode, context?: MMRMigrateErrorContext) {
    super(message);
    this.name = 'MMRMigrateError';
    this.code = code;
    this.context = context;
  }

  toString(): string {
    let errorString = `${this.name}: ${this.message}\nCode: ${this.code}`;
    if (this.context) {
      errorString += `\nContext:\n${JSON.stringify(this.context, null, 2)}`;
    }
    return errorString;
  }
}

export enum MigrationDirection {
  FileToDb = 'fileToDb',
  DbToFile = 'dbToFile',
}

export class MMRMigrateService {
  constructor(private nodeConfig: NodeConfig, private sequelize: Sequelize) {}

  async migrate(direction: MigrationDirection): Promise<void> {
    try {
      if (direction === MigrationDirection.FileToDb && !existsSync(this.nodeConfig.mmrPath)) {
        throw new MMRMigrateError(
          `MMR file not found: ${this.nodeConfig.mmrPath}`,
          MMRMigrateErrorCode.MMRFileNotFoundError
        );
      } else if (direction === MigrationDirection.DbToFile) {
        const schema = await getExistingProjectSchema(this.nodeConfig, this.sequelize);
        if (!schema) {
          throw new MMRMigrateError(
            `Project with db schema ${schema} does not exist`,
            MMRMigrateErrorCode.SchemaCreationError
          );
        }
        const tables = await this.sequelize.query('SELECT tablename FROM pg_tables WHERE schemaname = ?', {
          replacements: [schema],
          type: QueryTypes.SELECT,
        });
        const tableNames = tables.map((table: any) => table.tablename);

        if (!tableNames.includes('_mmr')) {
          throw new MMRMigrateError(
            'MMR data is not found in the database, unable to migrate.',
            MMRMigrateErrorCode.SchemaCreationError,
            {schema: schema}
          );
        }
      }

      const fileBasedMMRDb: FileBasedDb = existsSync(this.nodeConfig.mmrPath)
        ? await FileBasedDb.open(this.nodeConfig.mmrPath)
        : await FileBasedDb.create(this.nodeConfig.mmrPath, DEFAULT_WORD_SIZE);

      const schema =
        (await getExistingProjectSchema(this.nodeConfig, this.sequelize)) || (await this.createProjectSchema());
      const pgBasedMMRDb = await PgBasedMMRDB.create(this.sequelize, schema);

      const [source, target] =
        direction === MigrationDirection.FileToDb ? [fileBasedMMRDb, pgBasedMMRDb] : [pgBasedMMRDb, fileBasedMMRDb];

      const nodes = await source.getNodes();
      const sortedEntries = Object.entries(nodes).sort(([a], [b]) => parseInt(a) - parseInt(b));

      const totalNodes = sortedEntries.length;
      let completedNodes = 0;

      for (const [index, value] of sortedEntries) {
        await target.set(value, parseInt(index, 10));

        completedNodes++;
        const progressPercentage = Math.round((completedNodes / totalNodes) * 100);
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`Migration progress: ${progressPercentage}% | ${completedNodes}/${totalNodes} nodes`);
      }

      process.stdout.write('\n');

      const leafLength = await source.getLeafLength();
      await target.setLeafLength(leafLength);
    } catch (error) {
      if (error instanceof MMRMigrateError) {
        logger.error(`MMR migration error:\n${error.toString()}`);
      } else {
        logger.error('Unexpected error occurred during MMR migration:', error);
      }
      throw error;
    }
  }

  private async createProjectSchema(): Promise<string> {
    const schema = this.nodeConfig.dbSchema;
    const schemas = await this.sequelize.showAllSchemas(undefined as unknown as Logging);
    if (!(schemas as unknown as string[]).includes(schema)) {
      await this.sequelize.createSchema(`"${schema}"`, undefined as unknown as Logging);
    }
    return schema;
  }
}
