// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {existsSync} from 'fs';
import {DEFAULT_WORD_SIZE} from '@subql/common';
import {NodeConfig, getExistingProjectSchema, getLogger, PgBasedMMRDB} from '@subql/node-core';
import {MMR, FileBasedDb} from '@subql/x-merkle-mountain-range';
import {keccak256} from 'js-sha3';
import {Logging, Sequelize} from 'sequelize';

const logger = getLogger('mmr-migrate');

const DEFAULT_DB_SCHEMA = 'public';

const keccak256Hash = (...nodeValues: Uint8Array[]) => Buffer.from(keccak256(Buffer.concat(nodeValues)), 'hex');

export enum MigrationDirection {
  FileToDb = 'fileToDb',
  DbToFile = 'dbToFile',
}

export class MMRMigrateService {
  constructor(private sequelize: Sequelize, private nodeConfig: NodeConfig) {}

  async migrate(direction: MigrationDirection): Promise<void> {
    if (!existsSync(this.nodeConfig.mmrPath)) {
      logger.info(`MMR file does not found: ${this.nodeConfig.mmrPath}`);
      return;
    }

    let fileBasedMMRDb: FileBasedDb;

    if (existsSync(this.nodeConfig.mmrPath)) {
      fileBasedMMRDb = await FileBasedDb.open(this.nodeConfig.mmrPath);
    } else {
      fileBasedMMRDb = await FileBasedDb.create(this.nodeConfig.mmrPath, DEFAULT_WORD_SIZE);
    }

    const schema =
      (await getExistingProjectSchema(this.nodeConfig, this.sequelize)) || (await this.createProjectSchema());
    const pgBasedMMRDb = new PgBasedMMRDB(this.sequelize, schema);
    await pgBasedMMRDb.connect();

    logger.info(direction);
    const [source, target] =
      direction === MigrationDirection.FileToDb ? [fileBasedMMRDb, pgBasedMMRDb] : [pgBasedMMRDb, fileBasedMMRDb];

    const nodes = await source.getNodes();
    const sortedEntries = Object.entries(nodes).sort(([a], [b]) => a.localeCompare(b));

    for (const [index, value] of sortedEntries) {
      await target.set(value, parseInt(index, 10));
    }

    const leafLength = await source.getLeafLength();
    await target.setLeafLength(leafLength);
  }

  private async createProjectSchema(): Promise<string> {
    const schema = this.nodeConfig.localMode ? DEFAULT_DB_SCHEMA : this.nodeConfig.dbSchema;
    if (!this.nodeConfig.localMode) {
      const schemas = await this.sequelize.showAllSchemas(undefined as unknown as Logging);
      if (!(schemas as unknown as string[]).includes(schema)) {
        await this.sequelize.createSchema(`"${schema}"`, undefined as unknown as Logging);
      }
    }
    return schema;
  }
}
