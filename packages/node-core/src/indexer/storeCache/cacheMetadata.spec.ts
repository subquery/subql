// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {CacheMetadataModel} from './cacheMetadata';

const incrementKey = 'processedBlockCount';

describe('CacheMetadata', () => {
  let cacheMetadata: CacheMetadataModel;

  beforeEach(() => {
    cacheMetadata = new CacheMetadataModel(null as any);
  });

  // Clearing the cache used to set the setCache and getCache to the same empty object
  // The set cache has increment amounts while the get cache has the actual value
  it('clears the caches properly', () => {
    cacheMetadata.clear();

    (cacheMetadata as any).getCache[incrementKey] = 100;

    cacheMetadata.setIncrement(incrementKey);

    expect((cacheMetadata as any).setCache[incrementKey]).toBe(1);
  });
});
