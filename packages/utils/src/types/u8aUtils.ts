// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

/**
 * Due to current polkadotjs `numberToU8a` not support negative number,
 * These helper method used to convert negative to uint8Array, and revert it to number
 *
 * @param byteArray
 */

export function isNegativeU8a(byteArray: Uint8Array): boolean {
  return (byteArray[0] & 0x80) !== 0;
}

export function negativeU8aToNum(byteArray: Uint8Array) {
  if (!isNegativeU8a(byteArray)) {
    throw new Error(`byteArray didn't represent a negative number`);
  }
  const hexString = Array.from(byteArray, function (byte) {
    return `0${(byte & 0xff).toString(16)}`.slice(-2);
  }).join('');

  let num = parseInt(hexString, 16);
  if (num > 2147483647) {
    num -= 4294967296; // Subtract 2^32 for negative numbers
  }
  return num;
}

export function negativeToU8a(num: number) {
  if (num > 0) {
    throw new Error(`number must be negative`);
  }
  const hexString = (num >>> 0).toString(16);
  const byteArray = new Uint8Array(hexString.length / 2); // Create Uint8Array
  // Fill Uint8Array with bytes from hexadecimal representation
  for (let i = 0; i < hexString.length; i += 2) {
    const byte = parseInt(hexString.substr(i, 2), 16);
    byteArray[i / 2] = byte;
  }
  return byteArray;
}
