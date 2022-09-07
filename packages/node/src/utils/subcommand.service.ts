// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Inject, Injectable } from '@nestjs/common';
import { getLogger, NodeConfig, SubqueryRepo } from '@subql/node-core';
import { QueryTypes, Sequelize } from 'sequelize';

const logger = getLogger('Subcommand');
const DEFAULT_DB_SCHEMA = 'public';

@Injectable()
export class SubcommandService {
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

  // async getLastProcessedHeight(): Promise<number | undefined> {
  //     const res = await this.metadataRepo.findOne({
  //         where: { key: 'lastProcessedHeight' },
  //     });
  //
  //     return res?.value as number | undefined;
  // }
  //
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

  // async reindex (targetBlockHeight: number ): Promise<void> {
  //
  //       const lastProcessedHeight = await this.getLastProcessedHeight();
  //       if (!this.storeService.historical) {
  //         logger.warn('Unable to reindex, historical state not enabled');
  //         return;
  //       }
  //       if (!lastProcessedHeight || lastProcessedHeight < targetBlockHeight) {
  //         logger.warn(
  //           `Skipping reindexing to block ${targetBlockHeight}: current indexing height ${lastProcessedHeight} is behind requested block`,
  //         );
  //         return;
  //       }
  //       logger.info(`Reindexing to block: ${targetBlockHeight}`);
  //       const transaction = await this.sequelize.transaction();
  //       try {
  //         await this.storeService.rewind(argv.reindex, transaction);
  //
  //         const blockOffset = await this.getMetadataBlockOffset();
  //         if (blockOffset) {
  //           await this.mmrService.deleteMmrNode(targetBlockHeight + 1, blockOffset);
  //         }
  //         await transaction.commit();
  //       } catch (err) {
  //         logger.error(err, 'Reindexing failed');
  //         await transaction.rollback();
  //         throw err;
  //       }
  // }
}
