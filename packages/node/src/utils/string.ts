// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventFragment, FunctionFragment } from '@ethersproject/abi';
import { isHexString, hexStripZeros, hexDataSlice } from '@ethersproject/bytes';
import { id } from '@ethersproject/hash';

export function stringNormalizedEq(a: string, b: string): boolean {
  return a.toLowerCase() === b?.toLowerCase();
}

export function hexStringEq(a: string, b: string): boolean {
  if (!isHexString(a) || !isHexString(b)) {
    throw new Error('Inputs are not hex strings');
  }
  return stringNormalizedEq(hexStripZeros(a), hexStripZeros(b));
}

const eventTopicsCache: Record<string, string> = {};
const functionSighashCache: Record<string, string> = {};

export function eventToTopic(input: string): string {
  if (isHexString(input)) return input;

  if (!eventTopicsCache[input]) {
    eventTopicsCache[input] = id(EventFragment.fromString(input).format());
  }

  return eventTopicsCache[input];
}

export function functionToSighash(input: string): string {
  if (isHexString(input)) return input;

  if (!functionSighashCache[input]) {
    functionSighashCache[input] = hexDataSlice(
      id(FunctionFragment.fromString(input).format()),
      0,
      4,
    );
  }

  return functionSighashCache[input];
}
