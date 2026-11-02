// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getYargsOption} from '../../../yargs';
import {createTestContext} from './testHelpers';

jest.mock('../../../yargs', () => {
  const getYargsOption = jest.fn(() => ({
    argv: {
      name: 'test',
      aggregate: true,
      'query-limit': 100,
      unsafe: false,
      'order-by-nulls-last': true,
      indexer: undefined,
      'dictionary-optimisation': false,
    },
  }));
  const argv = (arg: string) => getYargsOption().argv[arg];
  return {
    getYargsOption,
    argv,
  };
});

const baseArgs = {
  name: 'test',
  aggregate: true,
  'query-limit': 100,
  unsafe: false,
  'order-by-nulls-last': true,
  indexer: undefined,
};

function withDictOptim(enabled: boolean) {
  (getYargsOption as jest.Mock).mockReturnValue({
    argv: {...baseArgs, 'dictionary-optimisation': enabled},
  });
}

describe('PgOrderByUniquePlugin', () => {
  const dbSchema = 'subquery_orderby_test';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".test_item (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        value INTEGER
      )
    `);
    await pool.query(`
      INSERT INTO "${dbSchema}".test_item (name, value) VALUES
        ('alpha', 10),
        ('beta', NULL),
        ('gamma', 10),
        ('delta', 20)
    `);
  });

  beforeEach(() => {
    (getYargsOption as jest.Mock).mockReturnValue({
      argv: {...baseArgs, 'dictionary-optimisation': false},
    });
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  it('adds NATURAL enum value to OrderBy types', async () => {
    const result = await runQuery(`
      { __type(name: "TestItemOrderBy") { enumValues { name } } }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.__type?.enumValues?.map((v: any) => v.name) || [];
    expect(names).toContain('NATURAL');
  });

  it('NATURAL orderBy works without error', async () => {
    const result = await runQuery(`
      { testItems(orderBy: [NATURAL]) { nodes { name } } }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.testItems?.nodes?.map((n: any) => n.name) || [];
    expect(names).toHaveLength(4);
  });

  it('orderByNull arg is present on connection fields', async () => {
    const result = await runQuery(`
      {
        __type(name: "TestItemOrderBy") { enumValues { name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    // Check the orderByNull arg on testItems connection
    const fieldResult = await runQuery(`
      { __schema { queryType { fields { name args { name } } } } }
    `);
    expect(fieldResult.errors).toBeUndefined();
    const testItemsField = fieldResult.data?.__schema?.queryType?.fields?.find((f: any) => f.name === 'testItems');
    expect(testItemsField).toBeDefined();
    const argNames = testItemsField.args.map((a: any) => a.name);
    expect(argNames).toContain('orderByNull');
  });

  it('NULLS_LAST orders nulls correctly', async () => {
    // With NULLS_LAST, null values appear after non-null
    const result = await runQuery(`
      {
        testItems(orderBy: [VALUE_ASC], orderByNull: NULLS_LAST) {
          nodes { name value }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testItems?.nodes || [];
    const nullIdx = nodes.findIndex((n: any) => n.value === null);
    const nonNullLast = nodes.length - 1;
    // beta (value=null) should be LAST (not first)
    expect(nullIdx).toBe(nonNullLast);
  });

  it('NULLS_FIRST orders nulls correctly', async () => {
    const result = await runQuery(`
      {
        testItems(orderBy: [VALUE_DESC], orderByNull: NULLS_FIRST) {
          nodes { name value }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testItems?.nodes || [];
    // beta (value=null) should be FIRST
    expect(nodes[0].name).toBe('beta');
  });

  // ── dictionary-optimisation flag ON ────────────────────────────────────

  it('dict-optim ON: orderBy on PK column', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      {
        testItems(orderBy: [PRIMARY_KEY_ASC]) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.testItems?.nodes?.map((n: any) => n.name) || [];
    expect(names).toEqual(['alpha', 'beta', 'gamma', 'delta']);
  });

  it('dict-optim ON: orderBy on non-unique column with ties', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      {
        testItems(orderBy: [VALUE_ASC]) {
          nodes { name value }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testItems?.nodes || [];
    expect(nodes).toHaveLength(4);
    // nulls last (order-by-nulls-last defaults to true)
    expect(nodes[nodes.length - 1].value).toBeNull();
    // all non-null values before the last row
    nodes.slice(0, -1).forEach((n: any) => expect(n.value).not.toBeNull());
  });

  it('dict-optim ON: orderByNull still works correctly', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      {
        testItems(orderBy: [VALUE_ASC], orderByNull: NULLS_FIRST) {
          nodes { name value }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testItems?.nodes || [];
    // With NULLS_FIRST and dict-optim, null appears first
    expect(nodes[0].name).toBe('beta');
  });

  it('dict-optim ON: NATURAL orderBy works', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      {
        testItems(orderBy: [NATURAL]) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes).toHaveLength(4);
  });

  it('dict-optim OFF then ON: flag toggling preserves results', async () => {
    // OFF: orderBy with nulls
    withDictOptim(false);
    let result = await runQuery(`
      {
        testItems(orderBy: [VALUE_ASC], orderByNull: NULLS_LAST) {
          nodes { name value }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const offNodes = result.data?.testItems?.nodes || [];
    const offNullIdx = offNodes.findIndex((n: any) => n.value === null);
    expect(offNullIdx).toBe(offNodes.length - 1);

    // ON: same query, same results
    withDictOptim(true);
    result = await runQuery(`
      {
        testItems(orderBy: [VALUE_ASC], orderByNull: NULLS_LAST) {
          nodes { name value }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const onNodes = result.data?.testItems?.nodes || [];
    const onNullIdx = onNodes.findIndex((n: any) => n.value === null);
    expect(onNullIdx).toBe(onNodes.length - 1);
  });

  it('returns results without error when no null ordering specified', async () => {
    // Gap #1 coverage: early-return path where both orderByNull arg and
    // --order-by-nulls-last flag are absent. Should fall back to PostgreSQL
    // default (nulls last for ASC) without crashing.
    (getYargsOption as jest.Mock).mockReturnValue({
      argv: {
        ...baseArgs,
        'order-by-nulls-last': undefined,
        'dictionary-optimisation': false,
      },
    });

    const result = await runQuery(`
      { testItems(orderBy: [VALUE_ASC]) { nodes { name value } } }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testItems?.nodes || [];
    expect(nodes).toHaveLength(4);
    // PostgreSQL default for ASC is nulls last
    expect(nodes[nodes.length - 1].value).toBeNull();
  });
});
