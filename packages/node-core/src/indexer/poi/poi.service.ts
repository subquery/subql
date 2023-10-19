// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Inject, Injectable, OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Op, QueryTypes, Transaction} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {getLogger} from '../../logger';
import {sqlIterator} from '../../utils';
import {StoreCacheService} from '../storeCache';
import {CachePoiModel} from '../storeCache/cachePoi';
import {ISubqueryProject} from '../types';

const logger = getLogger('PoiService');

/**
 * Poi service responsible for Poi creation.
 * Also, could migrate previous poi table and recorded rewind poi
 */

@Injectable()
export class PoiService implements OnApplicationShutdown {
  private isShutdown = false;
  private _poiRepo?: CachePoiModel;

  constructor(
    protected readonly nodeConfig: NodeConfig,
    private storeCache: StoreCacheService,
    private eventEmitter: EventEmitter2,
    @Inject('ISubqueryProject') private project: ISubqueryProject
  ) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  get poiRepo(): CachePoiModel {
    if (!this._poiRepo) {
      throw new Error(`No poi repo inited`);
    }
    return this._poiRepo;
  }

  /**
   * Init poi service, prepare poiRepo for rewind etc
   * Migrate poi if required.
   * @param schema
   */
  async init(schema: string): Promise<void> {
    this._poiRepo = this.storeCache.poi ?? undefined;
    if (!this._poiRepo) {
      return;
    }
    const latestSyncedPoiHeight = await this.storeCache.metadata.find('latestSyncedPoiHeight');
    const poiDataExist = await this._poiRepo?.model.findOne();
    if (latestSyncedPoiHeight === undefined && !!poiDataExist) {
      await this.migratePoi(schema);
    }
  }

  /**
   * Migrate previous poi table (with mmr etc)
   * @param schema
   * @private
   */
  private async migratePoi(schema: string): Promise<void> {
    try {
      logger.info('Migrating POI table, this may take some time');
      // Remove and Change column from sequelize not work, it only applies to public schema
      // https://github.com/sequelize/sequelize/issues/13365
      // await this.poiRepo?.model.sequelize?.getQueryInterface().changeColumn(tableName,'mmrRoot',{})
      const tableName = this.poiRepo.model.getTableName().toString();
      const checkAttributesQuery = `SELECT
        (NOT EXISTS (SELECT 1 FROM ${tableName} WHERE "operationHashRoot" IS NOT NULL)) AS operationHashRoot_nullable,
        (NOT EXISTS (SELECT 1 FROM ${tableName} WHERE "chainBlockHash" IS NOT NULL)) AS chainBlockHash_nullable,
        (NOT EXISTS (SELECT 1 FROM ${tableName} WHERE "hash" IS NOT NULL)) AS hash_nullable,
        (NOT EXISTS (SELECT 1 FROM ${tableName} WHERE "parentHash" IS NOT NULL)) AS parent_nullable,
        (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '_poi' AND column_name = 'mmrRoot' AND table_schema = '${schema}' )) AS mmr_exists;`;

      const checkResult = await this.poiRepo.model.sequelize?.query(checkAttributesQuery, {
        plain: true,
      });

      // Drop previous keys in metadata
      this.storeCache.metadata.bulkRemove(['blockOffset', 'latestPoiWithMmr', 'lastPoiHeight']);

      const queries = [];

      if (checkResult) {
        if (checkResult.mmr_exists) {
          queries.push(`ALTER TABLE ${tableName} DROP COLUMN "mmrRoot";`);
          queries.push(`DROP TABLE IF EXISTS "${schema}"."_mmr";`);
        }
        if (!checkResult.chainBlockHash_nullable) {
          queries.push(`ALTER TABLE ${tableName} ALTER COLUMN "operationHashRoot" DROP NOT NULL;`);
        }
        if (!checkResult.chainBlockHash_nullable) {
          queries.push(`ALTER TABLE ${tableName} ALTER COLUMN "chainBlockHash" DROP NOT NULL;`);
          // keep existing chainBlockHash
          queries.push(
            sqlIterator(
              tableName,
              `CREATE UNIQUE INDEX IF NOT EXISTS "poi_chainBlockHash" ON ${tableName} ("hash") WHERE "hash" IS NOT NULL`
            )
          );
        }
        if (!checkResult.hash_nullable) {
          queries.push(`ALTER TABLE ${tableName} ALTER COLUMN "hash" DROP NOT NULL;`);
          queries.push(sqlIterator(tableName, `UPDATE ${tableName} SET hash = NULL;`));
          queries.push(
            sqlIterator(
              tableName,
              `CREATE UNIQUE INDEX IF NOT EXISTS "poi_hash" ON ${tableName} ("hash") WHERE "hash" IS NOT NULL`
            )
          );
        }
        if (!checkResult.parent_nullable) {
          queries.push(`ALTER TABLE ${tableName} ALTER COLUMN "parentHash" DROP NOT NULL;`);
          queries.push(sqlIterator(tableName, `UPDATE ${tableName} SET "parentHash" = NULL;`));

          queries.push(
            sqlIterator(
              tableName,
              `CREATE UNIQUE INDEX IF NOT EXISTS "poi_parent_hash" ON ${tableName} ("parentHash") WHERE "parentHash" IS NOT NULL`
            )
          );
        }
      }

      if (queries.length) {
        const tx = await this.poiRepo.model.sequelize?.transaction();
        if (!tx) {
          throw new Error(`Create transaction for poi migration got undefined!`);
        }
        for (const query of queries) {
          try {
            await this.poiRepo?.model.sequelize?.query(query, {type: QueryTypes.SELECT, transaction: tx});
          } catch (e) {
            logger.error(`Migration poi failed with query: ${query}`);
            throw e;
          }
        }
        await tx.commit();
        logger.info(`Successful migrate Poi`);
        if (checkResult?.mmr_exists) {
          logger.info(`If file based mmr were used previously, it can be clean up mannually`);
        }
      }
    } catch (e) {
      throw new Error(`Failed to migrate poi table. {e}`);
    }
    logger.info('Migrating POI completed.');
  }

  async rewind(targetBlockHeight: number, transaction: Transaction): Promise<void> {
    await this.poiRepo.model.destroy({
      transaction,
      where: {
        id: {
          [Op.gt]: targetBlockHeight,
        },
      },
    });
    const lastSyncedPoiHeight = await this.storeCache.metadata.find('latestSyncedPoiHeight');
    if (lastSyncedPoiHeight !== undefined && lastSyncedPoiHeight > targetBlockHeight) {
      this.storeCache.metadata.set('latestSyncedPoiHeight', targetBlockHeight);
    }
    this.storeCache.metadata.bulkRemove(['lastCreatedPoiHeight']);
  }
}
