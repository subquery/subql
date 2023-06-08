// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  u8aConcat,
  numberToU8a,
  hexToU8a,
  isHex,
  isU8a,
  blake2AsU8a,
  isBase58,
  base58Decode,
  isBase64,
  base64Decode,
} from '@subql/utils';
import {ProofOfIndex} from '../entities/Poi.entity';

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
    // projectId is deprecated from _POI table, but in order to keep consist with previous hash,
    // We still take projectId as part of the calculation
    const _poiBlockHash = poiBlockHash(id, chainBlockHash, operationHashRoot, parentHash, projectId);
    let _chainBlockHash: Uint8Array | undefined;
    if (isHex(chainBlockHash)) {
      _chainBlockHash = hexToU8a(chainBlockHash);
    } else if (isU8a(chainBlockHash)) {
      _chainBlockHash = chainBlockHash;
      // needs release with to remove second check https://github.com/polkadot-js/common/pull/1842
    } else if (isBase58(chainBlockHash) && !chainBlockHash.includes('=')) {
      // Near block hashes are base58 encoded
      _chainBlockHash = base58Decode(chainBlockHash);
    } else if (isBase64(chainBlockHash)) {
      // Algorand block hashes are base64 encoded
      _chainBlockHash = base64Decode(chainBlockHash);
    } else {
      throw new Error(`Unable to create PoiBlock, chainBlockHash was not valid. Received: "${chainBlockHash}"`);
    }
    const poiBlock = new PoiBlock(id, _chainBlockHash, _poiBlockHash, parentHash, operationHashRoot, projectId);
    return poiBlock;
  }
}
