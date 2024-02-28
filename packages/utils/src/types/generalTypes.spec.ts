// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isU8a} from '@polkadot/util';
import {getTypeByScalarName} from '../types';
import {negativeToU8a} from './u8aUtils';

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

  it('Int type should able to hash negative value', () => {
    const testNum = -1;
    const testNum2 = -989899999;
    const testNum3 = 10000;
    const testNum4 = -98989999999999;
    const testArray = negativeToU8a(testNum);
    const testArray2 = negativeToU8a(testNum2);
    const testArray4 = negativeToU8a(testNum4);
    expect(() => negativeToU8a(testNum3)).toThrow();
    expect(isU8a(testArray)).toBeTruthy();
    expect(isU8a(testArray2)).toBeTruthy();
    expect(isU8a(testArray4)).toBeTruthy();
  });
});
