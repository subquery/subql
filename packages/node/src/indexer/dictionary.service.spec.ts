// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NodeConfig } from '@subql/node-core';
import { DictionaryService } from './dictionary.service';

describe('Dictionary service', () => {
  it('Can resovle chain aliases', async () => {
    const dictionary = await DictionaryService.create(
      {
        network: { chainId: '336', dictionary: 'https://foo.bar' } as any,
      } as any,
      new NodeConfig({} as any, true),
      null,
    );

    expect((dictionary as any).chainId).toBe(
      '0xf1cf9022c7ebb34b162d5b5e34e705a5a740b2d0ecc1009fb89023e62a488108',
    );
  });
});
