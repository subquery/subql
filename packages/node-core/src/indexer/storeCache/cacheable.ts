// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Transaction} from '@subql/x-sequelize';
import {Mutex} from 'async-mutex';

export abstract class Cacheable {
  protected mutex = new Mutex();

  abstract clear(blockHeight?: number): void;
  protected abstract runFlush(tx: Transaction, blockHeight?: number): Promise<void>;

  async flush(tx: Transaction, blockHeight?: number): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      tx.afterCommit(() => {
        release();
      });

      const pendingFlush = this.runFlush(tx, blockHeight);

      // Don't await DB operations to complete before clearing.
      // This allows new data to be cached while flushing
      this.clear(blockHeight);
      await pendingFlush;
    } catch (e) {
      release();
      throw e;
    }
  }
}
