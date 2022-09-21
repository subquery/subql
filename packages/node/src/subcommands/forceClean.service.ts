// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Inject, Injectable } from '@nestjs/common';
import {
  getLogger,
  NodeConfig,
  SubqueryRepo,
  getExistingProjectSchema,
} from '@subql/node-core';
import { QueryTypes, Sequelize } from 'sequelize';

const logger = getLogger('Force-clean');

@Injectable()
export class ForceCleanService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
  ) {}

  async forceClean(): Promise<void> {
    const schema = await getExistingProjectSchema(
      this.nodeConfig,
      this.sequelize,
      this.subqueryRepo,
    );
    if (!schema) {
      logger.error('Unable to locate schema');
      throw new Error('Schema does not exist.');
    }

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
      throw err;
    }
  }
}
