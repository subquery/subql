// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import {isValidEnum} from '../utils/index.js';

describe('Tests for validate, CLI', () => {
  it('ensure EnumValidator', () => {
    expect(isValidEnum(NETWORK_FAMILY, 'Cosmos')).toBe(true);
    expect(isValidEnum(NETWORK_FAMILY, 'bad')).toBe(false);
  });
});
