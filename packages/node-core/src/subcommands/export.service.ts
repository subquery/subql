// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import {pipeline} from 'node:stream/promises';
import path from 'path';
import {Inject, Injectable} from '@nestjs/common';
import {getAllEntitiesRelations} from '@subql/utils';
import {Sequelize} from '@subql/x-sequelize';
import {PoolClient, Pool} from 'pg';
import {to as copyTo} from 'pg-copy-streams';
import {NodeConfig} from '../configure';
import {ISubqueryProject} from '../indexer/types';
import {getLogger} from '../logger';
import {getExistingProjectSchema, modelToTableName} from '../utils';

const logger = getLogger('Export');

@Injectable()
export class ExportService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') protected project: ISubqueryProject
  ) {}

  async run(outPath: string, entities: string[]): Promise<void> {
    const schema = await getExistingProjectSchema(this.nodeConfig, this.sequelize);
    if (!schema) {
      logger.error('Unable to locate schema');
      throw new Error('Schema does not exist.');
    }

    const ensuredEntities = this.ensureEntities(entities);

    const pool = new Pool({
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'postgres',
    });

    const client = await pool.connect();

    // _metadata should always be exported
    await this.export(outPath, '_metadata', schema, client);
    try {
      await Promise.all(ensuredEntities.map((entity) => this.export(outPath, entity, schema, client)));
    } catch (e) {
      logger.error('failed export');
      throw e;
    } finally {
      client.release();
    }
    await pool.end();
    logger.info('Export Success');
  }
  private ensureEntities(entities: string[]): string[] {
    if (entities.includes('*')) {
      const allEntities = getAllEntitiesRelations(this.project.schema);
      return allEntities.models.map((model) => model.name);
    }
    return entities;
  }
  private async export(outPath: string, entity: string, schema: string, client: PoolClient): Promise<void> {
    const outputFilePath = path.join(outPath, `${schema}-${entity}.csv`);

    try {
      await fs.promises.stat(outputFilePath);
      throw new Error(`File ${outputFilePath} already exists.`);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }

    const outputFile = fs.createWriteStream(outputFilePath);

    const stream = client.query(
      copyTo(
        `COPY "${schema}".${
          entity === '_metadata' ? '_metadata' : modelToTableName(entity)
        } TO STDOUT WITH (FORMAT csv, DELIMITER ',')`
      )
    );
    await pipeline(stream, outputFile);
    logger.info(`Exported entity: ${entity} to ${outputFilePath}`);
  }
}
