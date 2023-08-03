// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DEFAULT_FETCH_RANGE} from '@subql/common';
import {u8aToBuffer, u8aToHex} from '@subql/utils';
import {Transaction} from '@subql/x-sequelize';
import {Mutex} from 'async-mutex';
import {getLogger} from '../../logger';
import {PoiRepo, ProofOfIndex} from '../entities';
import {ensureProofOfIndexId, PlainPoiModel, PoiInterface} from '../poi/poiModel';
import {ICachedModelControl} from './types';
const logger = getLogger('PoiCache');

export class CachePoiModel implements ICachedModelControl, PoiInterface {
  private setCache: Record<number, ProofOfIndex> = {};
  private removeCache: number[] = [];
  flushableRecordCounter = 0;
  private plainPoiModel: PlainPoiModel;
  private mutex = new Mutex();

  constructor(readonly model: PoiRepo) {
    this.plainPoiModel = new PlainPoiModel(model);
  }

  bulkUpsert(proofs: ProofOfIndex[]): void {
    for (const proof of proofs) {
      proof.chainBlockHash = u8aToBuffer(proof.chainBlockHash);
      proof.hash = u8aToBuffer(proof.hash);
      proof.parentHash = u8aToBuffer(proof.parentHash);
      // guard to ensure poi creation will not replace updated mmr
      if (this.setCache[proof.id] && this.setCache[proof.id].mmrRoot !== undefined) {
        return;
      }
      this.setCache[proof.id] = proof;
    }
  }

  async resetPoiMmr(latestPoiMmrHeight: number, targetHeight: number): Promise<void> {
    await this.mutex.waitForUnlock();
    for (let i = latestPoiMmrHeight; i < targetHeight; i++) {
      if (this.setCache[i] !== undefined) {
        this.setCache[i].mmrRoot = undefined;
      }
    }
    await this.plainPoiModel.resetPoiMmr(latestPoiMmrHeight, targetHeight);
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

    if (res) {
      return ensureProofOfIndexId(res?.toJSON<ProofOfIndex>());
    }
    return;
  }

  remove(id: number): void {
    this.flushableRecordCounter += 1;
    delete this.setCache[id];
    this.removeCache.push(id);
  }

  async getPoiBlocksByRange(startHeight: number): Promise<ProofOfIndex[]> {
    await this.mutex.waitForUnlock();
    const poiBlocks = await this.plainPoiModel.getPoiBlocksByRange(startHeight);
    return poiBlocks.length !== 0 ? poiBlocks : [];
  }

  // Deprecated, due to data merged from cache is missing, see test case
  async getPoiBlocksByRangeWithCache(startHeight: number): Promise<ProofOfIndex[]> {
    await this.mutex.waitForUnlock();
    let poiBlocks = await this.plainPoiModel.getPoiBlocksByRange(startHeight);
    if (poiBlocks.length < DEFAULT_FETCH_RANGE) {
      // means less than DEFAULT_FETCH_RANGE size blocks in database, it has reach the end of poi in db,
      // we can safely merge with cached data.
      poiBlocks = this.mergeResultsWithCache(poiBlocks).filter((poiBlock) => poiBlock.id >= startHeight);
      poiBlocks.sort((v) => v.id);
    }
    return poiBlocks.length !== 0 ? poiBlocks : [];
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
    const result = (await this.plainPoiModel.getLatestPoiWithMmr()) ?? undefined;
    return this.mergeResultsWithCache([result], 'desc').find((v) => !!v.mmrRoot) ?? null;
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
