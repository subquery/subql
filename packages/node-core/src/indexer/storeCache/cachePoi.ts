// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {u8aToBuffer} from '@polkadot/util';
import {uniqBy} from 'lodash';
import {Op, Transaction} from 'sequelize';
import {PoiRepo, ProofOfIndex} from '../entities';
import {ICachedModelControl} from './types';

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

  async getById(id: number): Promise<ProofOfIndex> {
    if (this.removeCache.includes(id)) {
      return undefined;
    }

    if (this.setCache[id]) {
      return this.setCache[id];
    }

    return this.model.findByPk(id);
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

    const poiBlocks = uniqBy([...Object.values(this.setCache), ...result], (i) => i.id);
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

    return Object.values(this.mergeResultWithCache(result)).reduce((acc, val) => {
      if (acc && acc.id < val.id) return acc;
      return val;
    }, null as ProofOfIndex | null);
  }

  async getLatestPoiWithMmr(): Promise<ProofOfIndex> {
    const poiBlock = await this.model.findOne({
      order: [['id', 'DESC']],
      where: {mmrRoot: {[Op.ne]: null}},
    });

    return Object.values(this.mergeResultWithCache(poiBlock))
      .filter((v) => v.mmrRoot !== null)
      .reduce((acc, val) => {
        if (acc && acc.id < val.id) return acc;
        return val;
      }, null as ProofOfIndex | null);
  }

  get isFlushable(): boolean {
    return !!(Object.entries(this.setCache).length && this.removeCache.length);
  }

  async flush(tx: Transaction): Promise<void> {
    await Promise.all([
      this.model.bulkCreate(Object.values(this.setCache), {transaction: tx}),
      this.model.destroy({where: {id: this.removeCache}, transaction: tx}),
    ]);

    this.clear();
  }

  private mergeResultWithCache(result: ProofOfIndex): Record<number, ProofOfIndex> {
    const copy = {...this.setCache};

    if (result) {
      copy[result.id] = result;
    }

    return copy;
  }

  clear(): void {
    this.setCache = {};
    this.removeCache = [];
    this.flushableRecordCounter = 0;
  }
}
