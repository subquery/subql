// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getTypeByScalarName} from '../types';

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
});
