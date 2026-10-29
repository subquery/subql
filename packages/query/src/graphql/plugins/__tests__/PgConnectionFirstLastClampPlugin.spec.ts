// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {createTestContext} from './testHelpers';

var mockGetYargsOption;

jest.mock('../../../yargs', () => {
  mockGetYargsOption = jest.fn(() => ({
    argv: {
      name: 'test',
      aggregate: true,
      'query-limit': 100,
      unsafe: false,
      'order-by-nulls-last': undefined,
    },
  }));
  const argv = (arg) => mockGetYargsOption().argv[arg];
  return {
    getYargsOption: mockGetYargsOption,
    argv,
  };
});

describe('PgConnectionFirstLastClampPlugin', () => {
  const dbSchema = 'subquery_clamp';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${dbSchema}`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".test_items (
        id INT PRIMARY KEY,
        value INT
      )
    `);
    for (let i = 1; i <= 200; i++) {
      await pool.query(`INSERT INTO "${dbSchema}".test_items (id, value) VALUES ($1, $2)`, [i, i]);
    }
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${dbSchema} CASCADE`);
    await pool.end();
  });

  beforeEach(() => {
    mockGetYargsOption.mockReturnValue({
      argv: {
        name: 'test',
        aggregate: true,
        'query-limit': 100,
        unsafe: false,
        'order-by-nulls-last': undefined,
      },
    });
  });

  /* ─── query-limit explicit clamping ─── */

  it('clamps first exceeding query-limit', async () => {
    const result = await runQuery(`
      { testItems(first: 200) { nodes { id } } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes?.length).toBeLessThanOrEqual(100);
  });

  it('clamps last exceeding query-limit', async () => {
    const result = await runQuery(`
      { testItems(last: 200) { nodes { id } } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes?.length).toBeLessThanOrEqual(100);
  });

  it('does not clamp first within query-limit', async () => {
    const result = await runQuery(`
      { testItems(first: 50) { nodes { id } } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes?.length).toEqual(50);
  });

  /* ─── default-first when no pagination ─── */

  it('applies default-first when no pagination args provided', async () => {
    const result = await runQuery(`
      { testItems { nodes { id } } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes?.length).toBeLessThanOrEqual(100);
  });

  /* ─── unsafe flag ─── */

  it('skips clamp when unsafe flag is set (explicit first)', async () => {
    mockGetYargsOption.mockReturnValue({
      argv: {
        name: 'test',
        aggregate: true,
        'query-limit': 100,
        unsafe: true,
        'order-by-nulls-last': undefined,
      },
    });

    const result = await runQuery(`
      { testItems(first: 200) { nodes { id } } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes?.length).toEqual(200);
  });

  it('skips default-first when unsafe flag is set (no pagination args)', async () => {
    mockGetYargsOption.mockReturnValue({
      argv: {
        name: 'test',
        aggregate: true,
        'query-limit': 100,
        unsafe: true,
        'order-by-nulls-last': undefined,
      },
    });

    const result = await runQuery(`
      { testItems { nodes { id } } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes?.length).toEqual(200);
  });

  /* ─── query-limit=0 (disabled) ─── */

  it('does not clamp when query-limit is 0 (disabled)', async () => {
    mockGetYargsOption.mockReturnValue({
      argv: {
        name: 'test',
        aggregate: true,
        'query-limit': 0,
        unsafe: false,
        'order-by-nulls-last': undefined,
      },
    });

    const result = await runQuery(`
      { testItems(first: 200) { nodes { id } } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes?.length).toEqual(200);
  });

  it('does not apply default-first when query-limit is 0', async () => {
    mockGetYargsOption.mockReturnValue({
      argv: {
        name: 'test',
        aggregate: true,
        'query-limit': 0,
        unsafe: false,
        'order-by-nulls-last': undefined,
      },
    });

    const result = await runQuery(`
      { testItems { nodes { id } } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes?.length).toEqual(200);
  });
});
