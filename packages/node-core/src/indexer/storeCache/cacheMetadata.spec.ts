// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
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

  // This tested a very specific use case where `cacheModel.getByFields`` was called on the start block which could trigger a flush and "lastProcessedHeight" was not yet set
  it('clears the caches properly with blockHeight', () => {
    cacheMetadata.clear(1);

    (cacheMetadata as any).getCache[incrementKey] = 100;

    cacheMetadata.setIncrement(incrementKey);

    expect(Object.keys((cacheMetadata as any).setCache)).not.toContain('lastProcessedHeight');
  });

  it('builds the correct dynamicDatasources query', () => {
    const queryFn = jest.fn();

    const cacheMetadata = new CacheMetadataModel({
      getTableName: () => '"Schema"."_metadata"',
      sequelize: {
        query: queryFn,
      },
    } as any);

    (cacheMetadata as any).appendDynamicDatasources([{foo: 'bar'}]);
    expect(queryFn).toHaveBeenCalledWith(
      `
      UPDATE "Schema"."_metadata"
      SET "value" = jsonb_set("value", array[(jsonb_array_length("value") + 1)::text], '{"foo":"bar"}'::jsonb, true),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "Schema"."_metadata".key = 'dynamicDatasources';
    `,
      undefined
    );

    (cacheMetadata as any).appendDynamicDatasources([{foo: 'bar'}, {baz: 'buzz'}]);
    expect(queryFn).toHaveBeenCalledWith(
      `
      UPDATE "Schema"."_metadata"
      SET "value" = jsonb_set(jsonb_set("value", array[(jsonb_array_length("value") + 1)::text], '{"foo":"bar"}'::jsonb, true), array[(jsonb_array_length("value") + 2)::text], '{"baz":"buzz"}'::jsonb, true),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "Schema"."_metadata".key = 'dynamicDatasources';
    `,
      undefined
    );
  });
});
