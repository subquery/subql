// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isHex} from '@polkadot/util';
import {HexString} from '@polkadot/util/types';

export {
  u8aEq,
  hexToU8a,
  hexToNumber,
  bufferToU8a,
  numberToU8a,
  numberToHex,
  u8aToHex,
  u8aConcat,
  u8aToBuffer,
  isU8a,
  isHex,
  isString,
  isBuffer,
  isNull,
} from '@polkadot/util';

export {blake2AsHex, blake2AsU8a, isBase58, isBase64, base58Decode, base64Decode} from '@polkadot/util-crypto';

// This is a clone from ethers.util hexStripZeros, in order to match polkadot util hex value with ethers
export function hexStripZeros(value: HexString): string {
  if (!isHex(value)) {
    throw new Error(`invalid hex string ${value}`);
  }
  const str = value.toString().substring(2);
  let offset = 0;
  while (offset < str.length && str[offset] === '0') {
    offset++;
  }
  const trimmed = `0x${str.substring(offset)}`;
  if (trimmed === '0x') {
    return '0x0';
  }
  return trimmed;
}
