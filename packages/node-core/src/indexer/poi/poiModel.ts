// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DEFAULT_FETCH_RANGE} from '@subql/common';
import {u8aToBuffer} from '@subql/utils';
import {Op} from '@subql/x-sequelize';
import {PoiRepo, ProofOfIndex} from '../entities';

export interface PoiInterface {
  model: PoiRepo;
  bulkUpsert(proofs: ProofOfIndex[]): Promise<void> | void;
  /**
   * Gets the first 100 blocks >= the startHeight.
   * */
  getPoiBlocksByRange(startHeight: number): Promise<ProofOfIndex[]>;
  /**
   * Gets the 100 blocks <= to the start height where there is an operation.
   * This can be used to determine the last blocks that had data to index.
   * */
  getPoiBlocksBefore(startHeight: number): Promise<ProofOfIndex[]>;
  getFirst(): Promise<ProofOfIndex | undefined>;
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

  async getPoiBlocksByRange(startHeight: number): Promise<ProofOfIndex[]> {
    const result = await this.model.findAll({
      limit: DEFAULT_FETCH_RANGE,
      where: {id: {[Op.gte]: startHeight}},
      order: [['id', 'ASC']],
    });
    return result.map((r) => ensureProofOfIndexId(r?.toJSON<ProofOfIndex>()));
  }

  async getPoiBlocksBefore(
    startHeight: number,
    options: {limit: number; offset: number} = {limit: DEFAULT_FETCH_RANGE, offset: 0}
  ): Promise<ProofOfIndex[]> {
    const result = await this.model.findAll({
      limit: options.limit,
      offset: options.offset,
      where: {
        id: {[Op.lte]: startHeight},
        operationHashRoot: {[Op.ne]: null},
      },
      order: [['id', 'DESC']],
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
}
