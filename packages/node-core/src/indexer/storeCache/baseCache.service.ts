// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BeforeApplicationShutdown, Injectable} from '@nestjs/common';
import Pino from 'pino';
import {getLogger} from '../../logger';
import {profiler} from '../../profiler';
import {timeout} from '../../utils/promise';

@Injectable()
export abstract class BaseCacheService implements BeforeApplicationShutdown {
  private pendingFlush?: Promise<void>;
  private queuedFlush?: Promise<void>;
  protected logger: Pino.Logger;

  protected constructor(private loggerName: string) {
    this.logger = getLogger(loggerName);
  }

  @profiler()
  async flushCache(forceFlush?: boolean, flushAll?: boolean): Promise<void> {
    const flushCacheGuarded = async (forceFlush?: boolean): Promise<void> => {
      // When we force flush, this will ensure not interrupt current block flushing,
      // Force flush will continue after last block flush tx committed.
      if (this.pendingFlush !== undefined) {
        await this.pendingFlush;
      }
      if ((this.isFlushable() || forceFlush) && this.flushableRecords > 0) {
        this.pendingFlush = this._flushCache(flushAll);
        // Remove reference to pending flush once it completes
        this.pendingFlush.finally(() => (this.pendingFlush = undefined));
        await this.pendingFlush;
      }
    };

    // Queued flush ensures that we only prepare one more task to flush, successive calls will return the same promise
    if (this.queuedFlush === undefined) {
      this.queuedFlush = flushCacheGuarded(forceFlush);

      this.queuedFlush.finally(() => (this.queuedFlush = undefined));
    }

    return this.queuedFlush;
  }
  async resetCache(): Promise<void> {
    await this._resetCache();
  }
  abstract _flushCache(flushAll?: boolean): Promise<void>;
  abstract _resetCache(): Promise<void> | void;
  abstract isFlushable(): boolean;
  abstract get flushableRecords(): number;

  async beforeApplicationShutdown(): Promise<void> {
    await timeout(this.flushCache(true), 60, 'Before shutdown flush cache timeout');
    this.logger.info(`Force flush cache successful!`);
  }
}
