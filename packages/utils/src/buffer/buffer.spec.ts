// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {hexStripZeros, numberToHex} from './buffer';

it('in getData, should hex number correctly', () => {
  const from = 10000;
  const to = 9999999;
  const to54897704 = 54897704;
  const zero = 0;

  // Use ethers.utils should have same output
  // expect(utils.hexValue(from)).toBe(numberToHex(from))
  // expect(utils.hexValue(to54897704)).toBe(hexStripZeros(numberToHex(to54897704)))
  expect(hexStripZeros(numberToHex(zero))).toBe('0x');
  expect(hexStripZeros(numberToHex(from))).toBe('0x2710');
  expect(hexStripZeros(numberToHex(to))).toBe('0x98967f');
  expect(hexStripZeros(numberToHex(to54897704))).toBe('0x345ac28');
});
