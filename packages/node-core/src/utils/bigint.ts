// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

interface BigInt {
  toJSON(): string;
}

// Make BigInt json serializable, note this doesn't go from string -> BigInt when parsing
BigInt.prototype.toJSON = function () {
  return `${this.toString()}n`;
};
