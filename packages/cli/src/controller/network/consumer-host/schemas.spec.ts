// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {convertApiKey} from './schemas';

describe('Parsing raw responses', () => {
  it('can parse an api key', () => {
    expect(() =>
      convertApiKey({
        id: 229,
        user_id: 700,
        name: 'test',
        value: 'N6HXY5OOX2OB06A8NCSOMNNL',
        times: 0,
        created_at: '2025-08-19T22:39:09.093246',
        updated_at: '2025-08-19T22:39:09.093',
      })
    ).not.toThrow();
  });
});
