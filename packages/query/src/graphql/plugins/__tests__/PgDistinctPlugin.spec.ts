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

describe('PgDistinctPlugin', () => {
  const dbSchema = 'subquery_distinct_test';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".test_item (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50),
        name VARCHAR(255)
      )
    `);
    await pool.query(`
      INSERT INTO "${dbSchema}".test_item (category, name) VALUES
        ('fruit', 'apple'),
        ('fruit', 'banana'),
        ('fruit', 'apple'),
        ('veggie', 'carrot'),
        ('veggie', 'celery'),
        ('fruit', 'apple')
    `);
  });

  beforeEach(() => {
    withDictOptim(false);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  // ── Baseline behaviour (flag OFF) ──────────────────────────────────────

  it('creates distinct enum type for table', async () => {
    const allTypes = await runQuery(`
      { __schema { types { name kind } } }
    `);
    expect(allTypes.errors).toBeUndefined();
    const typeNames = allTypes.data?.__schema?.types?.map((t: any) => t.name) || [];
    const distinctEnumNames = typeNames.filter((n: string) => n.toLowerCase().includes('distinct'));
    expect(distinctEnumNames.length).toBeGreaterThan(0);
  });

  it('returns all rows without distinct arg', async () => {
    const result = await runQuery(`
      { testItems { totalCount } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.totalCount).toBe(6);
  });

  it('returns distinct rows with distinct arg', async () => {
    const result = await runQuery(`
      {
        testItems(
          distinct: [CATEGORY]
          orderBy: [CATEGORY_ASC, PRIMARY_KEY_ASC]
        ) { nodes { category name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testItems?.nodes || [];
    expect(nodes.length).toBe(2);
  });

  it('distinct on multiple columns returns unique combinations', async () => {
    const result = await runQuery(`
      {
        testItems(
          distinct: [CATEGORY, NAME]
          orderBy: [CATEGORY_ASC, NAME_ASC]
        ) { nodes { category name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testItems?.nodes || [];
    expect(nodes).toHaveLength(4);
  });

  it('distinct arg also present on simple collection fields', async () => {
    const result = await runQuery(`
      { __schema { queryType { fields { name args { name } } } } }
    `);
    expect(result.errors).toBeUndefined();
    const testItemsField = result.data?.__schema?.queryType?.fields?.find((f: any) => f.name === 'testItems');
    expect(testItemsField).toBeDefined();
    const argNames = testItemsField.args.map((a: any) => a.name);
    expect(argNames).toContain('distinct');
  });

  // ── dictionary-optimisation flag ON ────────────────────────────────────

  it('dict-optim ON: distinct on single column returns correct rows', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      {
        testItems(
          distinct: [CATEGORY]
          orderBy: [CATEGORY_ASC, PRIMARY_KEY_ASC]
        ) { nodes { category name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes).toHaveLength(2);
  });

  it('dict-optim ON: distinct on multiple columns returns correct rows', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      {
        testItems(
          distinct: [CATEGORY, NAME]
          orderBy: [CATEGORY_ASC, NAME_ASC]
        ) { nodes { category name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes).toHaveLength(4);
  });

  it('dict-optim ON: no distinct arg returns all rows (not affected)', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      { testItems { totalCount } }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.totalCount).toBe(6);
  });

  it('dict-optim ON: distinct on column with three duplicate values returns 1', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      {
        testItems(
          distinct: [CATEGORY, NAME]
          orderBy: [CATEGORY_ASC, NAME_ASC]
        ) { nodes { category name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testItems?.nodes || [];
    // (fruit, apple) appears 3 times, distinct returns only 1
    const fruitApple = nodes.filter((n: any) => n.category === 'fruit' && n.name === 'apple');
    expect(fruitApple).toHaveLength(1);
  });

  it('dict-optim ON: distinct values are correctly ordered', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      {
        testItems(
          distinct: [NAME]
          orderBy: [NAME_ASC]
        ) { nodes { category name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.testItems?.nodes?.map((n: any) => n.name) || [];
    expect(names).toEqual(['apple', 'banana', 'carrot', 'celery']);
  });

  it('dict-optim ON: distinct with orderBy on multiple columns keeps order', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      {
        testItems(
          distinct: [CATEGORY]
          orderBy: [CATEGORY_DESC]
        ) { nodes { category name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    const categories = result.data?.testItems?.nodes?.map((n: any) => n.category) || [];
    // DESC order: veggie first, then fruit
    expect(categories).toEqual(['veggie', 'fruit']);
  });

  it('dict-optim ON: empty distinct array returns all rows', async () => {
    withDictOptim(true);
    const result = await runQuery(`
      {
        testItems(
          distinct: []
        ) { nodes { category name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes).toHaveLength(6);
  });

  it('dict-optim OFF then ON: flag toggling works correctly', async () => {
    // OFF: normal distinct
    withDictOptim(false);
    let result = await runQuery(`
      {
        testItems(
          distinct: [CATEGORY]
          orderBy: [CATEGORY_ASC, PRIMARY_KEY_ASC]
        ) { nodes { category name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes).toHaveLength(2);

    // ON: dict-optim distinct — same results
    withDictOptim(true);
    result = await runQuery(`
      {
        testItems(
          distinct: [CATEGORY]
          orderBy: [CATEGORY_ASC, PRIMARY_KEY_ASC]
        ) { nodes { category name } }
      }
    `);
    expect(result.errors).toBeUndefined();
    expect(result.data?.testItems?.nodes).toHaveLength(2);
  });
});
