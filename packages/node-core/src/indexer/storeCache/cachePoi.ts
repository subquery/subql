// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {u8aToBuffer} from '@subql/utils';
import {Transaction} from '@subql/x-sequelize';
import {getLogger} from '../../logger';
import {PoiRepo, ProofOfIndex} from '../entities';
import {ensureProofOfIndexId, PlainPoiModel, PoiInterface} from '../poi/poiModel';
import {Cacheable} from './cacheable';
import {ICachedModelControl} from './types';
const logger = getLogger('PoiCache');

export class CachePoiModel extends Cacheable implements ICachedModelControl, PoiInterface {
  private setCache: Record<number, ProofOfIndex> = {};
  flushableRecordCounter = 0;
  private plainPoiModel: PlainPoiModel;

  constructor(readonly model: PoiRepo) {
    super();
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

  async getPoiBlocksBefore(startHeight: number, options?: {offset: number; limit: number}): Promise<ProofOfIndex[]> {
    await this.mutex.waitForUnlock();
    return this.plainPoiModel.getPoiBlocksBefore(startHeight, options);
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

  protected async runFlush(tx: Transaction, blockHeight?: number): Promise<void> {
    logger.debug(`Flushing ${this.flushableRecordCounter} items from cache`);
    await Promise.all([
      this.model.bulkCreate(Object.values(this.setCache), {
        transaction: tx,
        updateOnDuplicate: ['hash', 'parentHash'],
      }),
    ]);
  }

  clear(blockHeight?: number): void {
    if (!blockHeight) {
      this.setCache = {};
      this.flushableRecordCounter = 0;
      return;
    }
    // Clear everything below the block height
    for (const [n, p] of Object.entries(this.setCache)) {
      if (Number(n) <= blockHeight) {
        delete this.setCache[Number(n)];
      }
    }
    this.flushableRecordCounter = Object.entries(this.setCache).length;
  }
}
