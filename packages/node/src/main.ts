// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import { QueryTypes, Sequelize } from 'sequelize';
import { AppModule } from './app.module';
import { NodeConfig } from './configure/NodeConfig';
import { IndexerManager } from './indexer/indexer.manager';
import { getLogger, NestLogger } from './utils/logger';
import { argv } from './yargs';

const logger = getLogger('subql-node');

async function bootstrap() {
  const forceclean = argv('force-clean');
  const debug = argv('debug');
  const port = argv('port') as number;
  try {
    const app = await NestFactory.create(AppModule, {
      logger: debug ? new NestLogger() : false,
    });
    await app.init();

    if (forceclean) {
      const sequelize = app.get(Sequelize);
      const nodeConfig = app.get(NodeConfig);
      sequelize.authenticate();

      try {
        // map subquery project name to db schema
        const [{ db_schema: subquerySchema }] = await sequelize.query(
          `SELECT db_schema
        FROM public.subqueries
        where name = '${nodeConfig.subqueryName}'`,
          {
            type: QueryTypes.SELECT,
          },
        );

        sequelize.dropSchema(subquerySchema, {
          logging: false,
          benchmark: false,
        });

        // remove db schema from project table
        await sequelize.query(
          ` DELETE
          FROM public.subqueries
          where db_schema = '${subquerySchema}'`,
          {
            type: QueryTypes.DELETE,
          },
        );
      } catch (err) {
        logger.error(err, 'failed to force clean schema and tables');
      }

      logger.info('force cleaned tables');
    }

    const indexerManager = app.get(IndexerManager);
    await indexerManager.start();
    await app.listen(port);
    getLogger('subql-node').info(`node started on port: ${port}`);
  } catch (e) {
    logger.error(e, 'node failed to start');
    process.exit(1);
  }
}

void bootstrap();
