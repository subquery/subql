// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {u8aToBuffer} from '@polkadot/util';
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
    const result = await this.model.findAll({
      limit: DEFAULT_FETCH_RANGE,
      where: {id: {[Op.gte]: startHeight}},
      order: [['id', 'ASC']],
    });

    const resultData = result.map((r) => r?.toJSON<ProofOfIndex>());

    const poiBlocks = Object.values(this.mergeResultsWithCache(resultData)).filter(
      (poiBlock) => poiBlock.id >= startHeight
    );
    if (poiBlocks.length !== 0) {
      return poiBlocks.sort((v) => v.id);
    } else {
      return [];
    }
  }

  async getLatestPoi(): Promise<ProofOfIndex | null | undefined> {
    const result = await this.model.findOne({
      order: [['id', 'DESC']],
    });

    return Object.values(this.mergeResultsWithCache([result?.toJSON<ProofOfIndex>()])).reduce((acc, val) => {
      if (acc && acc.id < val.id) return acc;
      return val;
    }, null as ProofOfIndex | null);
  }

  async getLatestPoiWithMmr(): Promise<ProofOfIndex> {
    const poiBlock = await this.model.findOne({
      order: [['id', 'DESC']],
      where: {mmrRoot: {[Op.ne]: null}},
    });

    return Object.values(this.mergeResultsWithCache([poiBlock?.toJSON<ProofOfIndex>()]))
      .filter((v) => !!v.mmrRoot)
      .reduce((acc, val) => {
        if (acc && acc.id < val.id) return acc;
        return val;
      }, null as ProofOfIndex | null);
  }

  get isFlushable(): boolean {
    return !!(Object.entries(this.setCache).length || this.removeCache.length);
  }

  async flush(tx: Transaction): Promise<void> {
    logger.info(`Flushing ${this.flushableRecordCounter} items from cache`);
    const pendingFlush = Promise.all([
      this.model.bulkCreate(Object.values(this.setCache), {transaction: tx, updateOnDuplicate: ['mmrRoot']}),
      this.model.destroy({where: {id: this.removeCache}, transaction: tx}),
    ]);

    // Don't await DB operations to complete before clearing.
    // This allows new data to be cached while flushing
    this.clear();

    await pendingFlush;
  }

  private mergeResultsWithCache(results: ProofOfIndex[]): Record<number, ProofOfIndex> {
    const copy = {...this.setCache};

    results.map((result) => {
      if (result) {
        copy[result.id] = result;
      }
    });

    return copy;
  }

  clear(): void {
    this.setCache = {};
    this.removeCache = [];
    this.flushableRecordCounter = 0;
  }
}
