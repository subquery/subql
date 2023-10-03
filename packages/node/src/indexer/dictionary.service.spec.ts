// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodeConfig } from '@subql/node-core';
import { DictionaryService } from './dictionary.service';

describe('dictionary service', () => {
  let dictionaryService: DictionaryService;

  beforeEach(() => {
    dictionaryService = new DictionaryService(
      {
        network: {
          chainId: 'juno-1',
          dictionary:
            'https://api.subquery.network/sq/subquery/cosmos-juno-dictionary',
        },
      } as any,
      { dictionaryTimeout: 10000 } as NodeConfig,
      new EventEmitter2(),
    );
  });

  it('successfully validates metatada', async () => {
    /* Genesis hash is unused with cosmos, chainId is used from project instead */
    await expect(
      dictionaryService.initValidation('juno-1'),
    ).resolves.toBeTruthy();
  });
});
