// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Injectable} from '@nestjs/common';
import {SchedulerRegistry} from '@nestjs/schedule';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {establishNewSequelize} from '../../db/db.module';
import {profiler} from '../../profiler';
import {getExistingProjectSchema} from '../../utils/project';
import {PgBasedMMRDB} from '../entities/Mmr.entitiy';
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

  private async initSequelize(nodeConfig: NodeConfig): Promise<void> {
    // Only create sequelize connection when required, and ensure only created once
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
  }

  // This should only been called once from mmr service
  async init(nodeConfig: NodeConfig): Promise<void> {
    await this.initSequelize(nodeConfig);
    const schema = await getExistingProjectSchema(nodeConfig, this.sequelize);
    assert(schema, 'Unable to check for MMR table, schema is undefined');
    const db = await PgBasedMMRDB.create(this.sequelize, schema);
    this._mmrRepo = CachePgMmrDb.create(db);
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
