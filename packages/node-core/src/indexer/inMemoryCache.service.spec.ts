// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {InMemoryCacheService} from './inMemoryCache.service';

describe('InMemoryCacheService', () => {
  let service: InMemoryCacheService;

  beforeEach(() => {
    service = new InMemoryCacheService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get value correctly', async () => {
    const cache = service.getCache();

    // Test with string
    await cache.set('testKey', 'testValue');
    const fetched_string = await cache.get('testKey');
    expect(fetched_string).toEqual('testValue');

    // Test with number
    await cache.set('testKey2', 123);
    const fetched_number = await cache.get('testKey2');
    expect(fetched_number).toEqual(123);

    // Test with object
    const obj = {prop: 'value'};
    await cache.set('testKey3', obj);
    const fetched_object = await cache.get('testKey3');
    expect(fetched_object).toEqual(obj);
  });

  it('should return undefined if key does not exist', async () => {
    const cache = service.getCache();
    const fetched = await cache.get('nonExistentKey');
    expect(fetched).toBeUndefined();
  });
});
