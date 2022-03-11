// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
});
