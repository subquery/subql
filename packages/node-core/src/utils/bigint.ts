// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

interface BigInt {
  toJSON(): string;
}

// Make BigInt json serializable, note this doesn't go from string -> BigInt when parsing
BigInt.prototype.toJSON = function () {
  return `${this.toString()}n`;
};
