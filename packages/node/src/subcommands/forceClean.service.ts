// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Inject, Injectable } from '@nestjs/common';
import { getLogger, NodeConfig, SubqueryRepo } from '@subql/node-core';
import { QueryTypes, Sequelize } from 'sequelize';

const logger = getLogger('Force-clean');
const DEFAULT_DB_SCHEMA = 'public';

@Injectable()
export class ForceCleanService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
  ) {}
  private async getExistingProjectSchema(): Promise<string> {
    let schema = this.nodeConfig.localMode
      ? DEFAULT_DB_SCHEMA
      : this.nodeConfig.dbSchema;

    // Note that sequelize.fetchAllSchemas does not include public schema, we cannot assume that public schema exists so we must make a raw query
    const schemas = (await this.sequelize
      .query(`SELECT schema_name FROM information_schema.schemata`, {
        type: QueryTypes.SELECT,
      })
      .then((xs) => xs.map((x: any) => x.schema_name))
      .catch((err) => {
        logger.error(`Unable to fetch all schemas: ${err}`);
        process.exit(1);
      })) as [string];

    if (!schemas.includes(schema)) {
      // fallback to subqueries table
      const subqueryModel = await this.subqueryRepo.findOne({
        where: { name: this.nodeConfig.subqueryName },
      });
      if (subqueryModel) {
        schema = subqueryModel.dbSchema;
      } else {
        schema = undefined;
      }
    }
    return schema;
  }

  async forceClean(): Promise<void> {
    const schema = await this.getExistingProjectSchema();
    try {
      // drop existing project schema and metadata table
      await this.sequelize.dropSchema(`"${schema}"`, {
        logging: false,
        benchmark: false,
      });

      // remove schema from subquery table (might not exist)
      await this.sequelize.query(
        ` DELETE
                  FROM public.subqueries
                  WHERE name = :name`,
        {
          replacements: { name: this.nodeConfig.subqueryName },
          type: QueryTypes.DELETE,
        },
      );

      logger.info('force cleaned schema and tables');

      if (fs.existsSync(this.nodeConfig.mmrPath)) {
        await fs.promises.unlink(this.nodeConfig.mmrPath);
        logger.info('force cleaned file based mmr');
      }
    } catch (err) {
      logger.error(err, 'failed to force clean');
    }
  }
}
