// SPDX-License-Identifier: Apache-2.0

// overwrite the official: https://github.com/zmitton/merkle-mountain-range/blob/master/src/digests.js
// fix the undefined digest issue in original package
import Bn from 'bignumber.js';
import { keccak256 } from 'js-sha3';
import shajs from 'sha.js';

// for variable difficulty used in flyClient
export const hashAndSum = (hashingFunction, ...nodeValues) => {
  const _numberToBytes32 = (input) => {
    const str = input.toString(16).padStart(64, '0');
    return Buffer.from(str, 'hex');
  };
  let diffucultySum = new Bn(0);
  for (let i = 0; i < nodeValues.length; i++) {
    const currentDifficulty = new Bn(
      `0x${nodeValues[i].slice(32).toString('hex')}`,
    );
    diffucultySum = diffucultySum.plus(currentDifficulty);
  }
  const finalHash = Buffer.from(
    hashingFunction(Buffer.concat(nodeValues)),
    'hex',
  );
  const difficultySumBytes = _numberToBytes32(diffucultySum);

  return Buffer.concat([finalHash, difficultySumBytes]);
};
export const keccak256FlyHash = (...nodeValues) => {
  return hashAndSum(keccak256, ...nodeValues);
};
export const sha256FlyHash = (...nodeValues) => {
  const sha256 = (x) => {
    return shajs('sha256').update(x).digest('hex');
  };
  return hashAndSum(sha256, ...nodeValues);
};
export const keccak = (a, b) => {
  return Buffer.from(keccak256(Buffer.concat([a, b])), 'hex');
};
