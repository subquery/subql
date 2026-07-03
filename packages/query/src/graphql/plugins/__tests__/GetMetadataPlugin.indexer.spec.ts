// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

/**
 * Separate test file for GetMetadataPlugin --indexer flag behavior.
 * Requires a different yargs mock (with indexer set) than the main test file.
 *
 * Tests the fallback path: when --indexer is set and no metadata table exists
 * (or table is empty), the plugin returns metaCache values instead of undefined.
 */
import {createTestContext} from './testHelpers';

jest.mock('../../../utils/asyncInterval', () => ({
  setAsyncInterval: jest.fn(),
}));

jest.mock('../../../yargs', () => {
  const getYargsOption = jest.fn(() => ({
    argv: {
      name: 'test',
      aggregate: true,
      'query-limit': 100,
      unsafe: false,
      'order-by-nulls-last': undefined,
      indexer: 'http://mock-indexer:3000',
    },
  }));
  const argv = (arg) => getYargsOption().argv[arg];
  return {
    getYargsOption,
    argv,
  };
});

describe('GetMetadataPlugin with --indexer flag', () => {
  const dbSchema = 'subquery_meta_indexer_test';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
    // No _metadata table — triggers the indexer fallback path
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  it('returns indexer cache values when no metadata table exists and --indexer is set', async () => {
    const result = await runQuery(`
      { _metadata { queryNodeVersion } }
    `);

    // Should not crash — returns metaCache values
    expect(result.errors).toBeUndefined();
    expect(result.data?._metadata).toBeDefined();
    // queryNodeVersion is always in metaCache (set at module init)
    expect(result.data?._metadata.queryNodeVersion).toBeDefined();
    expect(typeof result.data?._metadata.queryNodeVersion).toBe('string');
  });

  it('returns _metadatas with empty nodes when no metadata tables exist', async () => {
    const result = await runQuery(`
      { _metadatas { totalCount nodes { queryNodeVersion } } }
    `);

    expect(result.errors).toBeUndefined();
    // _metadatas with no tables should have totalCount 0
    expect(result.data?._metadatas).toBeDefined();
    expect(result.data?._metadatas.totalCount).toBe(0);
    expect(result.data?._metadatas.nodes).toEqual([]);
  });
});
