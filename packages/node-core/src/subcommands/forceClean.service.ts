// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Inject, Injectable} from '@nestjs/common';
import {getAllEntitiesRelations} from '@subql/utils';
import {QueryTypes, Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../configure';
import {ISubqueryProject} from '../indexer/types';
import {getLogger} from '../logger';
import {enumNameToHash, getEnumDeprecated, getExistingProjectSchema} from '../utils';

const logger = getLogger('Force-clean');

@Injectable()
export class ForceCleanService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') protected project: ISubqueryProject
  ) {}

  async forceClean(): Promise<void> {
    const schema = await getExistingProjectSchema(this.nodeConfig, this.sequelize);
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
          const enumTypeNameDeprecated = `${schema}_enum_${enumNameToHash(e.name)}`;
          const resultsDeprecated = await getEnumDeprecated(this.sequelize, enumTypeNameDeprecated);
          if (resultsDeprecated.length !== 0) {
            await this.sequelize.query(`
            DROP TYPE "${enumTypeNameDeprecated}";
          `);
          }
        })
      );

      // remove schema from subquery table (might not exist)
      const checker = await this.sequelize.query(
        `
              SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'public' AND  TABLE_NAME = 'subqueries'`
      );

      if ((checker[1] as any).rowCount > 0) {
        await this.sequelize.query(
          ` DELETE
                  FROM public.subqueries
                  WHERE name = :name`,
          {
            replacements: {name: this.nodeConfig.subqueryName},
            type: QueryTypes.DELETE,
          }
        );
      }

      logger.info('force cleaned schema and tables');
    } catch (err: any) {
      logger.error(err, 'failed to force clean');
      throw err;
    }
  }
}
