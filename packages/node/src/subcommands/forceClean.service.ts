// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Inject, Injectable } from '@nestjs/common';
import {
  getLogger,
  NodeConfig,
  getExistingProjectSchema,
  enumNameToHash,
  getEnumDeprecated,
} from '@subql/node-core';
import { getAllEntitiesRelations } from '@subql/utils';
import { QueryTypes, Sequelize } from 'sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';

const logger = getLogger('Force-clean');

@Injectable()
export class ForceCleanService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') protected project: SubqueryProject,
  ) {}

  async forceClean(): Promise<void> {
    const schema = await getExistingProjectSchema(
      this.nodeConfig,
      this.sequelize,
    );
    if (!schema) {
      logger.error('Unable to locate schema');
      throw new Error('Schema does not exist.');
    }
    const modelsRelation = getAllEntitiesRelations(this.project.schema);

    try {
      // drop existing project schema and metadata table
      await this.sequelize.dropSchema(`"${schema}"`, {
        logging: false,
        benchmark: false,
      });

      // TODO, remove this soon, once original enum are cleaned
      // Deprecate, now enums are moved under schema, drop schema will remove project enums
      await Promise.all(
        modelsRelation.enums.map(async (e) => {
          const enumTypeNameDeprecated = `${schema}_enum_${enumNameToHash(
            e.name,
          )}`;
          const resultsDeprecated = await getEnumDeprecated(
            this.sequelize,
            enumTypeNameDeprecated,
          );
          if (resultsDeprecated.length !== 0) {
            await this.sequelize.query(`
            DROP TYPE "${enumTypeNameDeprecated}";
          `);
          }
        }),
      );

      // remove schema from subquery table (might not exist)
      const checker = await this.sequelize.query(
        `
              SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'public' AND  TABLE_NAME = 'subqueries'`,
      );

      if ((checker[1] as any).rowCount > 0) {
        await this.sequelize.query(
          ` DELETE
                  FROM public.subqueries
                  WHERE name = :name`,
          {
            replacements: { name: this.nodeConfig.subqueryName },
            type: QueryTypes.DELETE,
          },
        );
      }

      logger.info('force cleaned schema and tables');

      if (fs.existsSync(this.nodeConfig.mmrPath)) {
        await fs.promises.unlink(this.nodeConfig.mmrPath);
        logger.info('force cleaned file based mmr');
      }
    } catch (err) {
      logger.error(err, 'failed to force clean');
      throw err;
    }
  }
}
