// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BeforeApplicationShutdown, Injectable} from '@nestjs/common';
import Pino from 'pino';
import {getLogger} from '../../logger';
import {profiler} from '../../profiler';
import {timeout} from '../../utils/promise';
import {BaseStoreModelService} from './baseStoreModel.service';
import {ICachedModelControl} from './types';

@Injectable()
export abstract class BaseCacheService
  extends BaseStoreModelService<ICachedModelControl>
  implements BeforeApplicationShutdown
{
  private pendingFlush?: Promise<void>;
  private queuedFlush?: Promise<void>;
  protected logger: Pino.Logger;

  abstract _flushCache(): Promise<void>;
  abstract _resetCache(): Promise<void> | void;
  abstract isFlushable(): boolean;
  abstract get flushableRecords(): number;

  protected constructor(loggerName: string) {
    super();
    this.logger = getLogger(loggerName);
  }

  @profiler()
  async flushData(forceFlush?: boolean): Promise<void> {
    const flushCacheGuarded = async (forceFlush?: boolean): Promise<void> => {
      // When we force flush, this will ensure not interrupt current block flushing,
      // Force flush will continue after last block flush tx committed.
      if (this.pendingFlush !== undefined) {
        await this.pendingFlush;
      }
      if ((this.isFlushable() || forceFlush) && this.flushableRecords > 0) {
        this.pendingFlush = this._flushCache();
        // Remove reference to pending flush once it completes
        this.pendingFlush
          .catch((e) => {
            /* Do nothing, avoids uncaught exception */
          })
          .finally(() => (this.pendingFlush = undefined));
        await this.pendingFlush;
      }
    };

    // Queued flush ensures that we only prepare one more task to flush, successive calls will return the same promise
    if (this.queuedFlush === undefined) {
      this.queuedFlush = flushCacheGuarded(forceFlush);

      this.queuedFlush
        .catch((e) => {
          /* Do nothing, avoids uncaught exception */
        })
        .finally(() => (this.queuedFlush = undefined));
    }

    return this.queuedFlush;
  }

  async resetData(): Promise<void> {
    await this._resetCache();
  }

  async beforeApplicationShutdown(): Promise<void> {
    await timeout(this.flushData(true), 60, 'Before shutdown flush cache timeout');
    this.logger.info(`Force flush cache successful!`);
    await super.beforeApplicationShutdown();
  }
}
