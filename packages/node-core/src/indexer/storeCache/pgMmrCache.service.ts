// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Injectable} from '@nestjs/common';
import {SchedulerRegistry} from '@nestjs/schedule';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {establishNewSequelize} from '../../db/db.module';
import {profiler} from '../../profiler';
import {getExistingProjectSchema} from '../../utils/project';
import {BaseCacheService} from './baseCache.service';
import {CachePgMmrDb} from './cacheMmr';

const INTERVAL_NAME = 'mmrCacheFlushInterval';

const MMR_FLUSH_INTERVAL = 2;

@Injectable()
export class PgMmrCacheService extends BaseCacheService {
  private _mmrRepo?: CachePgMmrDb;
  private _sequelize?: Sequelize;

  constructor(schedulerRegistry: SchedulerRegistry) {
    super(schedulerRegistry, INTERVAL_NAME, 'PgMmrCacheService');
  }

  get sequelize(): Sequelize {
    if (this._sequelize === undefined) {
      throw new Error(`Sequelize for mmr service is undefined`);
    }
    return this._sequelize;
  }

  get mmrRepo(): CachePgMmrDb {
    if (this._mmrRepo === undefined) {
      throw new Error(`PgMmrCacheService _mmrRepo is not defined`);
    }
    return this._mmrRepo;
  }

  async ensurePostgresBasedDb(nodeConfig: NodeConfig): Promise<CachePgMmrDb> {
    // Only create sequelize connection when required, and ensure only created once
    if (!this._mmrRepo) {
      if (this._sequelize) {
        throw new Error('pgMmrCache sequelize has been init more than once');
      }
      try {
        this._sequelize = await establishNewSequelize(nodeConfig);
        this.logger.info(`Mmr service using independent db connection`);
      } catch (e) {
        this.logger.error(`having problem initialise independent db connection for mmr service, ${e}`);
        throw e;
      }
      const schema = await getExistingProjectSchema(nodeConfig, this._sequelize);
      assert(schema, 'Unable to check for MMR table, schema is undefined');
      const db = await CachePgMmrDb.create(this.sequelize, schema);
      this.setMmrRepo(db);
    }
    return this.mmrRepo;
  }

  setMmrRepo(mmrRepo: CachePgMmrDb): void {
    this._mmrRepo = mmrRepo;
    this.setupInterval(INTERVAL_NAME, MMR_FLUSH_INTERVAL);
  }

  @profiler()
  async _flushCache(flushAll?: boolean | undefined): Promise<void> {
    const tx = await this.sequelize.transaction();
    try {
      await this.mmrRepo.flush(tx);
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
  isFlushable(): boolean {
    return this.mmrRepo.isFlushable;
  }
  get flushableRecords(): number {
    return this.mmrRepo.flushableRecords;
  }
}
