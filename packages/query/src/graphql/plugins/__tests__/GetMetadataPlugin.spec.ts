// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getMetadataTableName, MetaData} from '@subql/utils';
import {createTestContext} from './testHelpers';

jest.mock('../../../yargs', () => {
  const getYargsOption = jest.fn(() => ({
    argv: {
      name: 'test',
      aggregate: true,
      'query-limit': 100,
      unsafe: false,
      'order-by-nulls-last': undefined,

      indexer: undefined,
    },
  }));
  const argv = (arg) => getYargsOption().argv[arg];
  return {
    getYargsOption,
    argv,
  };
});

describe('GetMetadataPlugin', () => {
  const dbSchema = 'subquery_meta_test';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"._metadata (
        key VARCHAR(255) NOT NULL PRIMARY KEY,
        value JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await pool.query(
      `INSERT INTO "${dbSchema}"._metadata (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING`,
      ['chain', JSON.stringify('test-chain')]
    );
    await pool.query(
      `INSERT INTO "${dbSchema}"._metadata (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING`,
      ['specName', JSON.stringify('test-spec')]
    );
    await pool.query(
      `INSERT INTO "${dbSchema}"._metadata (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING`,
      ['startHeight', JSON.stringify(100)]
    );
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  // 1. Basic _metadata query returns correct fields
  it('returns metadata from _metadata table', async () => {
    const result = await runQuery(`
      { _metadata { chain specName startHeight } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?._metadata).toBeDefined();
    expect(result.data?._metadata.chain).toBe('test-chain');
    expect(result.data?._metadata.specName).toBe('test-spec');
    expect(result.data?._metadata.startHeight).toBe(100);
  });

  // 2. _metadata returns undefined for missing keys
  it('returns undefined for non-existent metadata key', async () => {
    const result = await runQuery(`
      { _metadata { chain lastProcessedHeight } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?._metadata.chain).toBe('test-chain');
    expect(result.data?._metadata.lastProcessedHeight).toBeNull();
  });

  // 3. _metadatas query returns totalCount + nodes
  it('returns _metadatas with totalCount and nodes', async () => {
    const result = await runQuery(`
      { _metadatas { totalCount nodes { chain specName } } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?._metadatas.totalCount).toBeGreaterThanOrEqual(1);
    expect(result.data?._metadatas.nodes).toBeDefined();
    expect(result.data?._metadatas.nodes.length).toBeGreaterThanOrEqual(1);
    expect(result.data?._metadatas.nodes[0].chain).toBe('test-chain');
  });

  // 4. rowCountEstimate is excluded from response when not in query
  it('excludes rowCountEstimate when not requested', async () => {
    const result = await runQuery(`
      { _metadata { chain specName } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?._metadata.chain).toBe('test-chain');
    expect(result.data?._metadata.specName).toBe('test-spec');
    // rowCountEstimate should not be present when not requested
    expect(result.data?._metadata.rowCountEstimate).toBeFalsy();
  });

  // 5. rowCountEstimate returns table estimate data when requested
  it('returns rowCountEstimate data when requested', async () => {
    // Run ANALYZE to update pg_class estimates for the _metadata table
    await pool.query(`ANALYZE "${dbSchema}"._metadata`);

    const result = await runQuery(`
      { _metadata { rowCountEstimate { table estimate } } }
    `);
    expect(result.errors).toBeUndefined();
    const estimates = result.data?._metadata?.rowCountEstimate;
    expect(Array.isArray(estimates)).toBe(true);
    // Should contain at least the _metadata table with 3 rows
    const metaEst = estimates.find((e: any) => e.table === '_metadata');
    expect(metaEst).toBeDefined();
    expect(metaEst.estimate).toBeGreaterThanOrEqual(3);
  });

  // 6. Multi-chain: metadata table with chainId suffix (uses blake2 hash per getMetadataTableName)
  it('supports multi-chain metadata tables', async () => {
    const chainId = 'test-chain-123';
    // Production uses blake2AsHex hash, regex matches [a-zA-Z0-9-]+
    const metaTableName = getMetadataTableName(chainId);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"."${metaTableName}" (
        key VARCHAR(255) NOT NULL PRIMARY KEY,
        value JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await pool.query(
      `INSERT INTO "${dbSchema}"."${metaTableName}" (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING`,
      ['chain', JSON.stringify('multi-chain')]
    );

    const result = await runQuery(`
      { _metadatas { totalCount nodes { chain } } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?._metadatas.totalCount).toBeGreaterThanOrEqual(2);
    const chains = result.data?._metadatas.nodes.map((n: any) => n.chain);
    expect(chains).toContain('test-chain');
    expect(chains).toContain('multi-chain');

    await pool.query(`DROP TABLE IF EXISTS "${dbSchema}"."${metaTableName}"`);
  });

  // 7. Schema name detection: no metadata table → returns null (not crash)
  it('gracefully handles schema with no metadata tables', async () => {
    const emptySchema = 'subquery_empty_meta';
    const {pool: emptyPool, runQuery: runEmptyQuery} = createTestContext(emptySchema);
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${emptySchema}"`);

    const result = await runEmptyQuery(`
      { _metadata { chain } }
    `);
    // Should not crash — returns null for _metadata when no table exists
    expect(result.data?._metadata).toBeNull();

    await pool.query(`DROP SCHEMA IF EXISTS "${emptySchema}" CASCADE`);
    await emptyPool.end();
  });

  // 8. Schema name detection: multiple schemas with metadata tables picks the correct one
  // (v5 derives schema name from pgResource.from SQL text, not from options.pgSchemas[0])
  it('detects schema name correctly from pgResource', async () => {
    // The _metadatas query should find metadata tables from the current schema only
    const secondarySchema = 'subquery_meta_secondary';
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${secondarySchema}"`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${secondarySchema}"._metadata (
        key VARCHAR(255) NOT NULL PRIMARY KEY,
        value JSONB
      )
    `);
    await pool.query(`INSERT INTO "${secondarySchema}"._metadata (key, value) VALUES ($1, $2::jsonb)`, [
      'chain',
      JSON.stringify('secondary-chain'),
    ]);

    // Query the primary schema — should only see its own metadata
    const result = await runQuery(`
      { _metadata { chain } }
    `);
    expect(result.errors).toBeUndefined();
    // Should return primary schema's chain, not the secondary one
    expect(result.data?._metadata.chain).toBe('test-chain');

    await pool.query(`DROP SCHEMA IF EXISTS "${secondarySchema}" CASCADE`);
  });
});
