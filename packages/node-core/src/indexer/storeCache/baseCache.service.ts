// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BeforeApplicationShutdown, Injectable} from '@nestjs/common';
import {SchedulerRegistry} from '@nestjs/schedule';
import {profiler} from '../../profiler';
import {timeout} from '../../utils/promise';

@Injectable()
export abstract class BaseCacheService implements BeforeApplicationShutdown {
  private pendingFlush?: Promise<void>;
  private queuedFlush?: Promise<void>;

  protected constructor(readonly schedulerRegistry: SchedulerRegistry, private intervalName: string) {}

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

  abstract _flushCache(flushAll?: boolean): Promise<void>;
  abstract isFlushable(): boolean;
  abstract get flushableRecords(): number;

  async beforeApplicationShutdown(): Promise<void> {
    this.schedulerRegistry.deleteInterval(this.intervalName);
    await timeout(this.flushCache(true), 5);
    logger.info(`Force flush cache successful!`);
  }
}
