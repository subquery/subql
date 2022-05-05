// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {EventFragment, FunctionFragment} from '@ethersproject/abi';
import {isHexString, hexStripZeros, hexDataSlice} from '@ethersproject/bytes';
import {id} from '@ethersproject/hash';

export function stringNormalizedEq(a: string, b: string): boolean {
  return a.toLowerCase() === b?.toLowerCase();
}

export function hexStringEq(a: string, b: string): boolean {
  if (!isHexString(a) || !isHexString(b)) {
    throw new Error('Inputs are not hex strings');
  }
  return stringNormalizedEq(hexStripZeros(a), hexStripZeros(b));
}

export function eventToTopic(input: string): string {
  if (isHexString(input)) return input;

  return id(EventFragment.fromString(input).format());
}

export function functionToSighash(input: string): string {
  if (isHexString(input)) return input;

  return hexDataSlice(id(FunctionFragment.fromString(input).format()), 0, 4);
}
