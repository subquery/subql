// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {numberToU8a, u8aConcat} from '@polkadot/util';

/**
 * Due to current polkadotjs `numberToU8a` not support negative number,
 * The helper method used to convert negative to a uint8Array
 *
 * @param byteArray
 */

export function wrappedNumToU8a(num: number) {
  if (num > 0) {
    return numberToU8a(num);
  }
  return u8aConcat(new Uint8Array([0]), numberToU8a(Math.abs(num)));
}
