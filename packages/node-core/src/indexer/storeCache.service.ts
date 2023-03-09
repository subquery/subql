// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable} from '@nestjs/common';
import {Entity} from '@subql/types';
import {CreationAttributes, Model, ModelStatic, Op, Sequelize, Transaction} from 'sequelize';
import {NodeConfig} from '../configure';

const FLUSH_FREQUENCY = 10;

@Injectable()
export class StoreCacheService {
  historical: boolean;
  private storeGetCache: Record<string, Record<string, Entity>>;
  private storeSetCache: Record<string, Record<string, Entity>>;
  private flushCounter: number;
  private tx: Transaction;

  constructor(private sequelize: Sequelize, private config: NodeConfig) {
    this.resetMemoryStore();
    this.flushCounter = 0;
  }

  counterIncrement(): void {
    this.flushCounter += 1;
  }

  registryTransaction(tx: Transaction): void {
    this.tx = tx;
    tx.afterCommit(() => (this.tx = undefined));
  }

  async commitTransaction(): Promise<void> {
    await this.tx.commit();
  }

  async flushCache(blockHeight: number): Promise<void> {
    if (!this.historical || Object.keys(this.storeSetCache).length === 0) {
      return;
    }
    await Promise.all(
      Object.entries(this.storeSetCache).map(([entityName, record]) => {
        const model = this.sequelize.model(entityName);
        return Promise.all([
          // mark to close previous records within blockheight -1, within all entity IDs
          this.markPreviousHeightRecordsBatch(model, Object.keys(record), blockHeight),
          // bulkCreate all new records for this entity
          model.bulkCreate(Object.values(record) as unknown as CreationAttributes<Model>[], {
            transaction: this.tx,
          }),
        ]);
      })
    );
  }

  isFlushable(): boolean {
    return this.flushCounter % FLUSH_FREQUENCY === 0;
  }

  resetMemoryStore() {
    this.storeGetCache = {};
    this.storeSetCache = {};
  }

  private async markPreviousHeightRecordsBatch(model: ModelStatic<any>, ids: string[], blockHeight: number) {
    // Different with markAsDeleted, we only mark/close all the records less than current block height
    // thus, and new record with current block height will not be impacted,
    // advantage is this sql is safe to concurrency resolve with any insert sql

    return model.update(
      {
        __block_range: this.sequelize.fn(
          'int8range',
          this.sequelize.fn('lower', this.sequelize.col('_block_range')),
          blockHeight
        ),
      },
      {
        hooks: false,
        transaction: this.tx,
        where: {
          id: {[Op.in]: ids},
          __block_range: {
            [Op.contains]: (blockHeight - 1) as any,
          },
        },
      }
    );
  }
}
