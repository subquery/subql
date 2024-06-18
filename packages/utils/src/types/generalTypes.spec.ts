// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isU8a, numberToU8a, u8aConcat} from '@polkadot/util';
import {u8aEq} from '@subql/utils';
import {getTypeByScalarName} from '../types';
import {wrappedNumToU8a} from './u8aUtils';

describe('general types', () => {
  it('can get json type', () => {
    const typeClass = getTypeByScalarName('Json');
    expect(typeClass?.name).toBe('Json');
  });

  it('get sequelize date type', () => {
    const typeClass = getTypeByScalarName('Date');
    expect(typeClass?.sequelizeType).toBe('timestamp');
  });

  it('get unsupported type', () => {
    expect(getTypeByScalarName('Unsupported' as any)).toBe(undefined);
  });

  it('Int type should able to hash negative value', () => {
    const testNum0 = 0;
    const testNum = -1;
    const testNum2 = -989899999;
    const testNum3 = 10000;
    const testNum4 = -98989999999999;
    expect(() => wrappedNumToU8a(testNum0)).not.toThrow();
    const testArray = wrappedNumToU8a(testNum);
    const testArray2 = wrappedNumToU8a(testNum2);
    const testArray4 = wrappedNumToU8a(testNum4);
    expect(u8aEq(wrappedNumToU8a(testNum3), numberToU8a(testNum3))).toBeTruthy();
    expect(isU8a(testArray)).toBeTruthy();
    expect(isU8a(testArray2)).toBeTruthy();
    expect(isU8a(testArray4)).toBeTruthy();

    expect(u8aEq(u8aConcat(new Uint8Array([0]), wrappedNumToU8a(1000)), wrappedNumToU8a(-1000))).toBeTruthy();
  });
});
