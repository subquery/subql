// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DEFAULT_FETCH_RANGE, RESET_MMR_BLOCK_BATCH} from '@subql/common';
import {u8aToBuffer} from '@subql/utils';
import {Op, Transaction} from 'sequelize';
import {getLogger} from '../../logger';
import {PoiRepo, ProofOfIndex} from '../entities';
const logger = getLogger('PoiCache');

export interface PoiInterface {
  model: PoiRepo;
  bulkUpsert(proofs: ProofOfIndex[]): Promise<void> | void;
  getLatestPoiWithMmr(): Promise<ProofOfIndex | null>;
  getPoiBlocksByRange(startHeight: number): Promise<ProofOfIndex[]>;
  resetPoiMmr?(latestPoiMmrHeight: number, targetHeight: number, tx: Transaction): Promise<void>;
}

// When using cockroach db, poi id is store in bigint format, and sequelize toJSON() can not convert id correctly (to string)
// This will ensure after toJSON Poi id converted to number
export function ensureProofOfIndexId(poi: ProofOfIndex): ProofOfIndex {
  if (typeof poi?.id === 'string') {
    poi.id = Number(poi.id);
  }
  return poi;
}

export class PlainPoiModel implements PoiInterface {
  constructor(readonly model: PoiRepo) {}

  async getPoiBlocksByRange(startHeight: number): Promise<ProofOfIndex[]> {
    const result = await this.model.findAll({
      limit: DEFAULT_FETCH_RANGE,
      where: {id: {[Op.gte]: startHeight}},
      order: [['id', 'ASC']],
    });
    return result.map((r) => ensureProofOfIndexId(r?.toJSON<ProofOfIndex>()));
  }

  async bulkUpsert(proofs: ProofOfIndex[]): Promise<void> {
    proofs.forEach((proof) => {
      proof.chainBlockHash = u8aToBuffer(proof.chainBlockHash);
      proof.hash = u8aToBuffer(proof.hash);
      proof.parentHash = u8aToBuffer(proof.parentHash);
    });
    await this.model.bulkCreate(proofs, {
      updateOnDuplicate: Object.keys(proofs[0]) as unknown as (keyof ProofOfIndex)[],
    });
  }

  // reset will be reverse order, in case exit mmr should still in order
  // we expect startHeight is usually greater than targetHeight
  async resetPoiMmr(latestPoiMmrHeight: number, targetHeight: number): Promise<void> {
    if (latestPoiMmrHeight === targetHeight) {
      return;
    }
    let latest = latestPoiMmrHeight;
    try {
      // reverse order
      while (targetHeight <= latest) {
        const results = (
          await this.model.findAll({
            limit: RESET_MMR_BLOCK_BATCH,
            where: {id: {[Op.lte]: latest, [Op.gte]: targetHeight}, mmrRoot: {[Op.ne]: null}} as any,
            order: [['id', 'DESC']],
          })
        ).map((r) => ensureProofOfIndexId(r?.toJSON<ProofOfIndex>()));
        if (results.length) {
          logger.info(
            `Reset POI block [${results[0].id} - ${results[results.length - 1].id}] mmr to NULL, total ${
              results.length
            } blocks `
          );
          for (const r of results) {
            r.mmrRoot = undefined;
          }
          await this.model.bulkCreate(results, {
            updateOnDuplicate: Object.keys(results[0]) as unknown as (keyof ProofOfIndex)[],
          });
          latest = results[results.length - 1].id - 1;
        } else {
          break;
        }
      }
    } catch (e) {
      throw new Error(`When try to reset POI mmr got problem: ${e}`);
    }
  }

  async getLatestPoiWithMmr(): Promise<ProofOfIndex | null> {
    const result = await this.model.findOne({
      order: [['id', 'DESC']],
      where: {mmrRoot: {[Op.ne]: null}} as any, // Types problem with sequelize, undefined works but not null
    });

    if (!result) {
      return null;
    }
    return ensureProofOfIndexId(result.toJSON());
  }
}
