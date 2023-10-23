// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {u8aToBuffer} from '@subql/utils';
import {Transaction} from '@subql/x-sequelize';
import {getLogger} from '../../logger';
import {PoiRepo, ProofOfIndex} from '../entities';
import {PlainPoiModel, PoiInterface} from '../poi/poiModel';
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

  get isFlushable(): boolean {
    return !!Object.entries(this.setCache).length;
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
    const cloneSetCache: Record<number, ProofOfIndex> = {};
    for (const [n, p] of Object.entries(this.setCache)) {
      if (Number(n) > blockHeight) {
        cloneSetCache[Number(n)] = p;
      }
    }
    this.setCache = cloneSetCache;
    this.flushableRecordCounter = Object.entries(this.setCache).length;
  }
}
