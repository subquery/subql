// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DEFAULT_FETCH_RANGE} from '@subql/common';
import {u8aToBuffer} from '@subql/utils';
import {Op, Transaction} from '@subql/x-sequelize';
import {PoiRepo, ProofOfIndex} from '../entities';

export interface PoiInterface {
  model: PoiRepo;
  bulkUpsert(proofs: ProofOfIndex[], tx?: Transaction): Promise<void> | void;
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

  async getFirst(): Promise<ProofOfIndex | undefined> {
    const result = await this.model.findOne({
      order: [['id', 'ASC']],
    });
    return result?.toJSON();
  }

  async getPoiById(id: number): Promise<ProofOfIndex | undefined> {
    const result = await this.model.findByPk(id);
    if (result) {
      return ensureProofOfIndexId(result?.toJSON<ProofOfIndex>());
    }
    return;
  }

  async getPoiBlocksByRange(startHeight: number): Promise<ProofOfIndex[]> {
    const result = await this.model.findAll({
      limit: DEFAULT_FETCH_RANGE,
      where: {id: {[Op.gte]: startHeight}},
      order: [['id', 'ASC']],
    });
    return result.map((r) => ensureProofOfIndexId(r?.toJSON<ProofOfIndex>()));
  }

  async bulkUpsert(proofs: ProofOfIndex[], tx: Transaction): Promise<void> {
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
    }
    await this.model.bulkCreate(proofs, {
      transaction: tx,
      conflictAttributes: ['id'],
      updateOnDuplicate: ['hash', 'parentHash'],
    });
  }
}
