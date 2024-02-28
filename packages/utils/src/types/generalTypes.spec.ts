// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {numberToU8a} from '@polkadot/util';
import {getTypeByScalarName} from '../types';
import {isNegativeU8a, negativeToU8a, negativeU8aToNum} from './u8aUtils';

describe('general types', () => {
  it('can get json type', () => {
    const typeClass = getTypeByScalarName('Json');
    expect(typeClass.name).toBe('Json');
  });

  it('get sequelize date type', () => {
    const typeClass = getTypeByScalarName('Date');
    expect(typeClass.sequelizeType).toBe('timestamp');
  });

  it('get unsupported type', () => {
    expect(getTypeByScalarName('Unsupported')).toBe(undefined);
  });

  it('Int type should able to hash negative value, also revertible', () => {
    const testNum = -1;
    const testNum2 = -9898999;

    const testNum3 = 10000;

    const testArray = negativeToU8a(testNum);
    const testArray2 = negativeToU8a(testNum2);

    expect(() => negativeToU8a(testNum3)).toThrow();

    const testArrayIsNegative = isNegativeU8a(testArray);
    const testArray2IsNegative = isNegativeU8a(testArray2);

    // a positive number U8a should be detected
    const polkadotU8a = numberToU8a(testNum3);
    const testArray3IsNegative = isNegativeU8a(polkadotU8a);

    expect(testArrayIsNegative).toBeTruthy();
    expect(testArray2IsNegative).toBeTruthy();
    expect(testArray3IsNegative).toBeFalsy();

    const revertTestNum = negativeU8aToNum(testArray);
    const revertTestNum2 = negativeU8aToNum(testArray2);

    expect(testNum).toBe(revertTestNum);
    expect(testNum2).toBe(revertTestNum2);
  });
});
