// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {createTestContext} from './testHelpers';

jest.mock('../../../yargs', () => {
  const getYargsOption = jest.fn(() => ({
    argv: {
      name: 'test',
      aggregate: true,
      'query-limit': 100,
      unsafe: false,
      'order-by-nulls-last': undefined,
    },
  }));
  const argv = (arg) => getYargsOption().argv[arg];
  return {
    getYargsOption,
    argv,
  };
});

const SUFFIX_TABLE = '_metadata_abc123';

describe('smartTagsPlugin replacement (pgSmartTags in preset)', () => {
  const dbSchema = 'subquery_smart_tags_test';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
    // Table NOT matching _metadata/_global pattern (to test column-level smart tags)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".test_table (
        id INT PRIMARY KEY,
        _id TEXT,
        _block_range INT8RANGE,
        _block_height BIGINT
      )
    `);
    // Table matching _metadata exactly — should be hidden
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"."_metadata" (
        id INT PRIMARY KEY,
        key TEXT,
        value TEXT
      )
    `);
    // Table matching .*_metadata$ suffix (e.g. multi-chain) — should be hidden
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"."${SUFFIX_TABLE}" (
        id INT PRIMARY KEY,
        chain TEXT
      )
    `);
    // Table matching _global — should be hidden
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"."_global" (
        id INT PRIMARY KEY,
        setting TEXT
      )
    `);
    await pool.query(`
      INSERT INTO "${dbSchema}"."_global" (id, setting) VALUES (1, 'setting')
    `);
    await pool.query(`
      INSERT INTO "${dbSchema}".test_table (id, _id, _block_range, _block_height)
      VALUES (1, 'internal-id', '[0,)', 50)
    `);
    await pool.query(`
      INSERT INTO "${dbSchema}"."_metadata" (id, key, value) VALUES (1, 'k', 'v')
    `);
    await pool.query(`
      INSERT INTO "${dbSchema}"."${SUFFIX_TABLE}" (id, chain) VALUES (1, 'multi')
    `);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  // ─── Table-level hiding ───

  it('_metadata table auto-generated fields should be hidden from schema', async () => {
    const result = await runQuery(`{ __schema { queryType { fields { name } } } }`);
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__schema?.queryType?.fields?.map((f: any) => f.name) || [];
    // GetMetadataPlugin adds custom _metadata / _metadatas — those are expected.
    // The auto-generated connection (renamed to _allMetadata by PgFixMetadataFieldPlugin)
    // should be hidden by pgSmartTags.
    expect(fieldNames).not.toContain('_allMetadata');
    // GetMetadataPlugin fields should still be present (not affected by pgSmartTags)
    expect(fieldNames).toContain('_metadata');
    expect(fieldNames).toContain('_metadatas');
  });

  it('_global table should be hidden from schema', async () => {
    const result = await runQuery(`{ __schema { queryType { fields { name } } } }`);
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__schema?.queryType?.fields?.map((f: any) => f.name) || [];
    expect(fieldNames).not.toContain('_globals');
  });

  it('_metadata suffix table (multi-chain pattern) should be hidden from schema', async () => {
    const result = await runQuery(`{ __schema { queryType { fields { name } } } }`);
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__schema?.queryType?.fields?.map((f: any) => f.name) || [];
    // Suffix-matching table _metadata_abc123 should not expose auto-generated fields
    // (singular, byId, connection)
    expect(fieldNames).not.toContain('_metadataAbc123');
    expect(fieldNames).not.toContain('_metadataAbc123s');
    expect(fieldNames).not.toContain('_metadataAbc123ById');
  });

  // ─── Positive: schema still works ───

  it('test_table is still queryable (positive control)', async () => {
    const result = await runQuery(`{ testTables { nodes { id } } }`);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testTables?.nodes?.length).toBeGreaterThanOrEqual(1);
    // id returns global Node ID (base64), not raw integer
    expect(typeof result.data?.testTables?.nodes[0]?.id).toBe('string');
    expect(result.data.testTables.nodes[0].id).toMatch(/^W/);
  });

  // ─── Column-level hiding from read ───

  it('_id column should be hidden from read operations', async () => {
    // Query the type by __type(name:) instead of filtering __schema.types
    const result = await runQuery(`{ __type(name: "TestTable") { name fields { name } } }`);
    expect(result.errors).toBeUndefined();
    const testType = result.data?.__type;
    expect(testType).toBeDefined();
    expect(testType?.fields).toBeDefined();
    const fieldNames = testType!.fields.map((f: any) => f.name);
    expect(fieldNames).not.toContain('_id');
  });

  it('_block_range column should be hidden from read operations', async () => {
    const result = await runQuery(`{ __type(name: "TestTable") { name fields { name } } }`);
    expect(result.errors).toBeUndefined();
    const testType = result.data?.__type;
    expect(testType).toBeDefined();
    expect(testType?.fields).toBeDefined();
    const fieldNames = testType!.fields.map((f: any) => f.name);
    expect(fieldNames).not.toContain('_blockRange');
  });

  it('table columns not hidden by smartTags are still readable', async () => {
    // Prove the _id and _block_range hiding is selective — other cols visible
    const result = await runQuery(`{ testTables(first: 1) { nodes { id } } }`);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testTables?.nodes?.length).toBeGreaterThanOrEqual(1);
    expect(typeof result.data?.testTables?.nodes?.[0]?.id).toBe('string');
  });

  // ─── Aggregate orderBy exclusion ───

  it('_block_height should be hidden from aggregate orderBy enum', async () => {
    const result = await runQuery(`{ __type(name: "TestTableOrderBy") { enumValues { name } } }`);
    expect(result.errors).toBeUndefined();
    const names = result.data?.__type?.enumValues?.map((v: any) => v.name) || [];
    expect(names).not.toContain('BLOCK_HEIGHT');
    // Sanity: enum still has some values
    expect(names.length).toBeGreaterThan(0);
  });

  it('_id should be hidden from aggregate orderBy enum', async () => {
    const result = await runQuery(`{ __type(name: "TestTableOrderBy") { enumValues { name } } }`);
    expect(result.errors).toBeUndefined();
    const names = result.data?.__type?.enumValues?.map((v: any) => v.name) || [];
    expect(names).not.toContain('BLOCK_HEIGHT');
    expect(names).not.toContain('ID');
    expect(names).not.toContain('_ID');
    expect(names.length).toBeGreaterThan(0);
  });

  it('_block_range should be hidden from orderBy enum (no -attribute:orderBy behavior)', async () => {
    const result = await runQuery(`{ __type(name: "TestTableOrderBy") { enumValues { name } } }`);
    expect(result.errors).toBeUndefined();
    const names = result.data?.__type?.enumValues?.map((v: any) => v.name) || [];
    expect(names).not.toContain('BLOCK_RANGE');
  });
});
