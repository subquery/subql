// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {u8aToBuffer} from '@subql/utils';
import {Transaction} from '@subql/x-sequelize';
import {Mutex} from 'async-mutex';
import {getLogger} from '../../logger';
import {PoiRepo, ProofOfIndex} from '../entities';
import {ensureProofOfIndexId, PlainPoiModel, PoiInterface} from '../poi/poiModel';
import {ICachedModelControl} from './types';
const logger = getLogger('PoiCache');

export class CachePoiModel implements ICachedModelControl, PoiInterface {
  private setCache: Record<number, ProofOfIndex> = {};
  flushableRecordCounter = 0;
  private plainPoiModel: PlainPoiModel;
  private mutex = new Mutex();

  constructor(readonly model: PoiRepo) {
    this.plainPoiModel = new PlainPoiModel(model);
  }

  bulkUpsert(proofs: ProofOfIndex[]): void {
    for (const proof of proofs) {
      if (proof.chainBlockHash !== null) {
        proof.chainBlockHash = u8aToBuffer(proof.chainBlockHash);
      }
      if (proof.hash !== undefined) {
        proof.hash = u8aToBuffer(proof.hash);
      }
      if (proof.parentHash !== undefined) {
        proof.parentHash = u8aToBuffer(proof.parentHash);
      }
      this.setCache[proof.id] = proof;
    }
  }
  async getPoiBlocksByRange(startHeight: number): Promise<ProofOfIndex[]> {
    await this.mutex.waitForUnlock();
    return this.plainPoiModel.getPoiBlocksByRange(startHeight);
  }

  async getPoiBlocksBefore(startHeight: number): Promise<ProofOfIndex[]> {
    await this.mutex.waitForUnlock();
    return this.plainPoiModel.getPoiBlocksBefore(startHeight);
  }
  async getPoiById(id: number): Promise<ProofOfIndex | undefined> {
    await this.mutex.waitForUnlock();
    if (this.setCache[id]) {
      return this.setCache[id];
    }
    const result = await this.model.findByPk(id);
    if (result) {
      return ensureProofOfIndexId(result?.toJSON<ProofOfIndex>());
    }
    return;
  }

  get isFlushable(): boolean {
    return !!Object.entries(this.setCache).length;
  }

  async getFirst(): Promise<ProofOfIndex | undefined> {
    await this.mutex.waitForUnlock();
    return this.plainPoiModel.getFirst();
  }

  async flush(tx: Transaction): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      tx.afterCommit(() => {
        release();
      });
      logger.debug(`Flushing ${this.flushableRecordCounter} items from cache`);
      const pendingFlush = Promise.all([
        this.model.bulkCreate(Object.values(this.setCache), {
          transaction: tx,
          updateOnDuplicate: ['hash', 'parentHash'],
        }),
      ]);

      // Don't await DB operations to complete before clearing.
      // This allows new data to be cached while flushing
      this.clear();
      await pendingFlush;
    } catch (e) {
      release();
      throw e;
    }
  }

  private clear(): void {
    this.setCache = {};
    this.flushableRecordCounter = 0;
  }
}
