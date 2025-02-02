// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Transaction} from '@subql/x-sequelize';
import {Mutex} from 'async-mutex';

export abstract class Cacheable {
  protected mutex = new Mutex();

  abstract clear(historicalUnit?: number): void;
  protected abstract runFlush(tx: Transaction, historicalUnit: number): Promise<void>;

  async flush(tx: Transaction, historicalUnit: number): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      tx.afterCommit(() => {
        this.clear(historicalUnit);
        release();
      });

      await this.runFlush(tx, historicalUnit);
    } catch (e) {
      release();
      throw e;
    }
  }
}
