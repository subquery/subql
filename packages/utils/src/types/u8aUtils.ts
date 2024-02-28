// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {hexToU8a, numberToHex} from '@polkadot/util';

/**
 * Due to current polkadotjs `numberToU8a` not support negative number,
 * The helper method used to convert negative to a uint8Array
 *
 * @param byteArray
 */

export function negativeToU8a(num: number) {
  if (num > 0) {
    throw new Error(`number must be negative`);
  }
  const hexString = `0${numberToHex(Math.abs(num))}`;
  return hexToU8a(hexString);
}
