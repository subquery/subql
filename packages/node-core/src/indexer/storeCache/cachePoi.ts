// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {u8aToBuffer} from '@subql/utils';
import {Mutex} from 'async-mutex';
import {Op, Transaction} from 'sequelize';
import {getLogger} from '../../logger';
import {PoiRepo, ProofOfIndex} from '../entities';
import {ICachedModelControl} from './types';

const logger = getLogger('PoiCache');

const DEFAULT_FETCH_RANGE = 100;

export class CachePoiModel implements ICachedModelControl {
  private setCache: Record<number, ProofOfIndex> = {};
  private removeCache: number[] = [];
  flushableRecordCounter = 0;
  private mutex = new Mutex();

  constructor(readonly model: PoiRepo) {}

  set(proof: ProofOfIndex): void {
    proof.chainBlockHash = u8aToBuffer(proof.chainBlockHash);
    proof.hash = u8aToBuffer(proof.hash);
    proof.parentHash = u8aToBuffer(proof.parentHash);

    if (this.setCache[proof.id] === undefined) {
      this.flushableRecordCounter += 1;
    }

    this.setCache[proof.id] = proof;
  }

  async getById(id: number): Promise<ProofOfIndex | undefined> {
    await this.mutex.waitForUnlock();
    if (this.removeCache.includes(id)) {
      logger.debug(`Attempted to get deleted POI with id="${id}"`);
      return undefined;
    }

    if (this.setCache[id]) {
      return this.setCache[id];
    }

    const res = await this.model.findByPk(id);

    return res?.toJSON<ProofOfIndex>();
  }

  remove(id: number): void {
    this.flushableRecordCounter += 1;
    delete this.setCache[id];
    this.removeCache.push(id);
  }

  async getPoiBlocksByRange(startHeight: number): Promise<ProofOfIndex[]> {
    await this.mutex.waitForUnlock();
    const result = await this.model.findAll({
      limit: DEFAULT_FETCH_RANGE,
      where: {id: {[Op.gte]: startHeight}},
      order: [['id', 'ASC']],
    });

    const resultData = result.map((r) => r?.toJSON<ProofOfIndex>());

    const poiBlocks = this.mergeResultsWithCache(resultData).filter((poiBlock) => poiBlock.id >= startHeight);
    if (poiBlocks.length !== 0) {
      return poiBlocks.sort((v) => v.id);
    } else {
      return [];
    }
  }

  async getLatestPoi(): Promise<ProofOfIndex | null | undefined> {
    await this.mutex.waitForUnlock();
    const result = await this.model.findOne({
      order: [['id', 'DESC']],
    });

    return this.mergeResultsWithCache([result?.toJSON()], 'desc')[0];
  }

  async getLatestPoiWithMmr(): Promise<ProofOfIndex | null> {
    await this.mutex.waitForUnlock();
    const result = await this.model.findOne({
      order: [['id', 'DESC']],
      where: {mmrRoot: {[Op.ne]: null}} as any, // Types problem with sequelize, undefined works but not null
    });

    return this.mergeResultsWithCache([result?.toJSON()], 'desc').find((v) => !!v.mmrRoot) ?? null;
  }

  get isFlushable(): boolean {
    return !!(Object.entries(this.setCache).length || this.removeCache.length);
  }

  async flush(tx: Transaction): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      tx.afterCommit(() => {
        release();
      });
      logger.debug(`Flushing ${this.flushableRecordCounter} items from cache`);
      const pendingFlush = Promise.all([
        this.model.bulkCreate(Object.values(this.setCache), {transaction: tx, updateOnDuplicate: ['mmrRoot']}),
        this.model.destroy({where: {id: this.removeCache}, transaction: tx}),
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

  private mergeResultsWithCache(results: (ProofOfIndex | undefined)[], order: 'asc' | 'desc' = 'asc'): ProofOfIndex[] {
    const copy = {...this.setCache};

    results.forEach((result) => {
      if (result) {
        copy[result.id] = result;
      }
    });

    const ascending = Object.values(copy).sort((a, b) => a.id - b.id);

    if (order === 'asc') {
      return ascending;
    }

    return ascending.reverse();
  }

  private clear(): void {
    this.setCache = {};
    this.removeCache = [];
    this.flushableRecordCounter = 0;
  }
}
