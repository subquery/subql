// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
  u8aToBuffer,
} from '@subql/utils';
import {ProofOfIndex} from '../entities/Poi.entity';
export const DEFAULT_BLOCK_HASH = hexToU8a('0x00');
export const NULL_OPERATION_HASH = hexToU8a('0x00');

const poiBlockHash = (
  id: number,
  chainBlockHash: string | Uint8Array | null,
  operationHashRoot: Uint8Array | null,
  projectId: string,
  parentHash: Uint8Array
): Uint8Array => {
  if (!id || !projectId || chainBlockHash === undefined || operationHashRoot === undefined) {
    throw new Error('Poof of index: can not generate block hash');
  }
  return blake2AsU8a(
    u8aConcat(
      numberToU8a(id),
      chainBlockHash ?? u8aToBuffer(DEFAULT_BLOCK_HASH),
      operationHashRoot ?? u8aToBuffer(NULL_OPERATION_HASH),
      Buffer.from(projectId),
      parentHash
    )
  );
};

export class PoiBlock implements ProofOfIndex {
  // poi block id, this usually same as on chain block height
  readonly id: number;
  // on chain block hash
  readonly chainBlockHash: Uint8Array | null;
  // Hash generated from store actions within current block
  readonly operationHashRoot: Uint8Array | null;
  // project deployment ID
  readonly projectId: string;
  // previous poi block hash
  readonly parentHash: Uint8Array | undefined;
  // current poi hash, this is hash from above values.
  readonly hash: Uint8Array | undefined;

  constructor(
    id: number,
    chainBlockHash: Uint8Array | null,
    operationHashRoot: Uint8Array | null,
    projectId: string,
    parentHash?: Uint8Array,
    hash?: Uint8Array
  ) {
    this.id = id;
    this.chainBlockHash = chainBlockHash;
    this.operationHashRoot = operationHashRoot;
    this.projectId = projectId;
    this.parentHash = parentHash;
    this.hash = hash;
  }

  static create(
    id: number,
    chainBlockHash: string | Uint8Array | null,
    operationHashRoot: Uint8Array | null,
    projectId: string,
    parentHash?: Uint8Array
  ): PoiBlock {
    // projectId is deprecated from _POI table, but in order to keep consist with previous hash,
    // We still take projectId as part of the calculation

    // Validation for default empty block
    if (
      (operationHashRoot === null && chainBlockHash !== null) ||
      (operationHashRoot !== null && chainBlockHash === null)
    ) {
      throw new Error(
        `Create POI block ${id} failed, chainBlockHash and operationHashRoot should be both null or both defined`
      );
    }
    if (operationHashRoot === null && chainBlockHash === null) {
      // For default empty block, it can not be a genesis hash, parentHash must be defined
      if (parentHash === undefined) {
        throw new Error(`Create default POI ${id} failed, parentHash must be defined.`);
      }
    }

    let _chainBlockHash: Uint8Array | null;
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
    } else if (chainBlockHash === null) {
      // For empty block, those we didn't process and skipped
      _chainBlockHash = null;
    } else {
      throw new Error(`Unable to create PoiBlock, chainBlockHash was not valid. Received: "${chainBlockHash}"`);
    }

    let hash: Uint8Array | undefined;
    if (parentHash !== undefined) {
      hash = poiBlockHash(id, _chainBlockHash, operationHashRoot, projectId, parentHash);
    }
    const poiBlock = new PoiBlock(id, _chainBlockHash, operationHashRoot, projectId, parentHash, hash);
    return poiBlock;
  }
}
