// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
// eslint-disable-next-line header/header
import {u8aConcat, numberToU8a, hexToU8a, isHex, isU8a} from '@polkadot/util';
import {blake2AsU8a} from '@polkadot/util-crypto';
import {ProofOfIndex} from './entities';

const poiBlockHash = (
  id: number,
  chainBlockHash: string | Uint8Array,
  operationHashRoot: Uint8Array,
  parentHash: Uint8Array,
  projectId: string
): Uint8Array => {
  if (!id || !chainBlockHash || !operationHashRoot || !projectId) {
    throw new Error('Poof of index: can not generate block hash');
  }
  return blake2AsU8a(u8aConcat(numberToU8a(id), chainBlockHash, operationHashRoot, Buffer.from(projectId), parentHash));
};

export class PoiBlock implements ProofOfIndex {
  readonly id: number;
  readonly chainBlockHash: Uint8Array;
  readonly hash: Uint8Array;
  readonly parentHash: Uint8Array;
  readonly operationHashRoot: Uint8Array;
  mmrRoot: Uint8Array;
  readonly projectId: string;

  constructor(
    id: number,
    chainBlockHash: Uint8Array,
    hash: Uint8Array,
    parentHash: Uint8Array,
    operationHashRoot: Uint8Array,
    projectId: string
  ) {
    this.id = id;
    this.chainBlockHash = chainBlockHash;
    this.hash = hash;
    this.parentHash = parentHash;
    this.operationHashRoot = operationHashRoot;
    this.projectId = projectId;
  }

  static create(
    id: number,
    chainBlockHash: string | Uint8Array,
    operationHashRoot: Uint8Array,
    parentHash: Uint8Array,
    projectId: string
  ): PoiBlock {
    const _poiBlockHash = poiBlockHash(id, chainBlockHash, operationHashRoot, parentHash, projectId);
    let _chainBlockHash: Uint8Array;
    if (isHex(chainBlockHash)) {
      _chainBlockHash = hexToU8a(chainBlockHash);
    } else if (isU8a(chainBlockHash)) {
      _chainBlockHash = chainBlockHash;
    }
    const poiBlock = new PoiBlock(id, _chainBlockHash, _poiBlockHash, parentHash, operationHashRoot, projectId);
    return poiBlock;
  }
}
