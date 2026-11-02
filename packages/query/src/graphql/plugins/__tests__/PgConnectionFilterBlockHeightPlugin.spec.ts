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
      indexer: undefined,
    },
  }));
  const argv = (arg) => getYargsOption().argv[arg];
  return {
    getYargsOption,
    argv,
  };
});

describe('PgConnectionFilterBlockHeightPlugin', () => {
  const dbSchema = 'subquery_filter_bh_test';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);

    // ── Child table with _block_range ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".filter_child (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        value INTEGER,
        _block_range INT8RANGE
      )
    `);

    await pool.query(`
      INSERT INTO "${dbSchema}".filter_child (name, value, _block_range) VALUES
        ('child_default', 0, '[,]'::int8range),
        ('child_a', 10, '[1,5)'::int8range),
        ('child_b', 20, '[5,10)'::int8range)
    `);

    // ── Parent table FK -> child, also has _block_range (unbounded) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".filter_parent (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        child_id INTEGER REFERENCES "${dbSchema}".filter_child(id),
        _block_range INT8RANGE
      )
    `);

    await pool.query(`
      INSERT INTO "${dbSchema}".filter_parent (name, child_id, _block_range) VALUES
        ('parent_default', 1, '[,]'::int8range),
        ('parent_a', 2, '[,]'::int8range),
        ('parent_b', 3, '[,]'::int8range)
    `);

    // ── Child table WITHOUT _block_range (negative control) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".plain_child (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);

    await pool.query(`
      INSERT INTO "${dbSchema}".plain_child (name) VALUES ('plain_a'), ('plain_b')
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".plain_parent (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        plain_child_id INTEGER REFERENCES "${dbSchema}".plain_child(id)
      )
    `);

    await pool.query(`
      INSERT INTO "${dbSchema}".plain_parent (name, plain_child_id) VALUES
        ('plain_a_parent', 1),
        ('plain_b_parent', 2)
    `);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  /* ───────── Backward relation filter with blockHeight (existsPlan path) ───────── */

  it('injects blockHeight into backward relation filter subquery', async () => {
    // blockHeight "2": child_a ([1,5)) visible, child_b ([5,10)) not visible
    // filter: child name equalTo "child_a" → parent_a returned
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "2",
          filter: { child: { name: { equalTo: "child_a" } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_a');
    expect(names).not.toContain('parent_b');
  });

  it('filter with different blockHeight returns different results', async () => {
    // blockHeight "7": child_a ([1,5)) NOT visible, child_b ([5,10)) visible
    // filter: child name equalTo "child_b" → parent_b returned
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "7",
          filter: { child: { name: { equalTo: "child_b" } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_b');
    expect(names).not.toContain('parent_a');
  });

  it('filter excludes results when child not visible at given blockHeight', async () => {
    // blockHeight "7": child_a not visible → filter for child_a should return 0 results
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "7",
          filter: { child: { name: { equalTo: "child_a" } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.filterParents?.nodes || [];
    expect(nodes).toHaveLength(0);
  });

  /* ───────── Default MAX behavior ───────── */

  it('filter without blockHeight uses default MAX (only unbounded child matches)', async () => {
    // Default MAX: child_default ([,] unbounded) visible, child_a/child_b not
    const result = await runQuery(`
      {
        filterParents(
          filter: { child: { name: { equalTo: "child_default" } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_default');
    expect(names).not.toContain('parent_a');
    expect(names).not.toContain('parent_b');
  });

  it('default MAX filter returns no results for bounded-only child', async () => {
    // No unbounded child with name "child_a" → 0 results
    const result = await runQuery(`
      {
        filterParents(
          filter: { child: { name: { equalTo: "child_a" } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.filterParents?.nodes || [];
    expect(nodes).toHaveLength(0);
  });

  /* ───────── Non-historical table NOT affected ───────── */

  it('does not inject blockHeight into filter on tables without _block_range', async () => {
    // plain_child has no _block_range → blockHeight should not affect filter subquery
    const result = await runQuery(`
      {
        plainParents(
          filter: { plainChild: { name: { equalTo: "plain_a" } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.plainParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('plain_a_parent');
  });

  /* ───────── Negation filter (notPlan path) ───────── */

  it('injects blockHeight into negated relation filter (notPlan)', async () => {
    // blockHeight "2": child_a visible, child_b not visible
    // filter: not { child: { name: { equalTo: "child_b" } } } →
    //   excludes parent_b (child_b not visible at block 2 anyway, so same)
    // At blockHeight 2, negating child_b excludes nothing since child_b already invisible.
    // Instead test: not { child: { name: { equalTo: "child_a" } } } → excludes parent_a
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "2",
          filter: { not: { child: { name: { equalTo: "child_a" } } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).not.toContain('parent_a');
    expect(names).toContain('parent_default');
    expect(names).toContain('parent_b');
  });

  it('not filter at blockHeight where target invisible returns all', async () => {
    // blockHeight "7": child_a NOT visible
    // not { child: { name: { equalTo: "child_a" } } } → since child_a already not in results,
    // all parents pass
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "7",
          filter: { not: { child: { name: { equalTo: "child_a" } } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_default');
    expect(names).toContain('parent_a');
    expect(names).toContain('parent_b');
  });

  /* ───────── Composite filter: AND (andPlan path) ───────── */

  it('injects blockHeight into composite AND filter', async () => {
    // blockHeight "7": only child_b visible
    // and: [{ child: { name: { equalTo: "child_a" } } }, { child: { value: { greaterThan: 5 } } }]
    // At block 7: child_a not visible → condition fails → 0 results
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "7",
          filter: {
            and: [
              { child: { name: { equalTo: "child_a" } } },
              { child: { value: { greaterThan: 5 } } }
            ]
          }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.filterParents?.nodes || [];
    expect(nodes).toHaveLength(0);
  });

  it('composite AND filter matches when all sub-filters pass at blockHeight', async () => {
    // blockHeight "2": child_a visible, value=10 > 5
    // and: [{ child: { name: { equalTo: "child_a" } } }, { child: { value: { greaterThan: 5 } } }]
    // → parent_a matches
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "2",
          filter: {
            and: [
              { child: { name: { equalTo: "child_a" } } },
              { child: { value: { greaterThan: 5 } } }
            ]
          }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_a');
  });

  /* ───────── Composite filter: OR (orPlan path) ───────── */

  it('injects blockHeight into composite OR filter', async () => {
    // blockHeight "2": child_a visible, child_b not visible
    // or: [{ child: { name: { equalTo: "child_a" } } }, { child: { name: { equalTo: "child_b" } } }]
    // child_a matches → parent_a returned
    // child_b not visible at block 2 → not returned
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "2",
          filter: {
            or: [
              { child: { name: { equalTo: "child_a" } } },
              { child: { name: { equalTo: "child_b" } } }
            ]
          }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_a');
    expect(names).not.toContain('parent_b');
  });

  /* ───────── Deeply nested filter composition ───────── */

  it('injects blockHeight through deeply nested filter (not + and + or)', async () => {
    // blockHeight "2": child_a visible
    // not: { and: [ { child: { name: { equalTo: "child_a" } } } ] }
    // not (child_a visible) → excludes parent_a → returns default + parent_b
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "2",
          filter: {
            not: {
              and: [
                { child: { name: { equalTo: "child_a" } } }
              ]
            }
          }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_default');
    expect(names).toContain('parent_b');
    expect(names).not.toContain('parent_a');
  });

  /* ───────── Scalar filter field NOT affected ───────── */

  it('does not wrap scalar filter fields (not a relation)', async () => {
    // blockHeight "2" with scalar filter on parent name — should work normally
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "2",
          filter: { name: { equalTo: "parent_a" } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_a');
    expect(names).toHaveLength(1);
  });

  /* ───────── Forward many-relation: every/some/none (FilterMany path) ───────── */

  it('injects blockHeight into some relation filter', async () => {
    // Need a backward many-relation. child→parents is many since child_id not unique.
    // children(blockHeight: "2", filter: { filterParents: { some: { name: { equalTo: "parent_a" } } } })
    // At block 2, child_a visible → its backward parents include parent_a → matches
    // child_b NOT visible at block 2 → its backward parents excluded
    const result = await runQuery(`
      {
        filterChildren(
          blockHeight: "2",
          filter: { parentFilterParents: { some: { name: { equalTo: "parent_a" } } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterChildren?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('child_a');
    expect(names).not.toContain('child_b');
  });

  it('every filter respects blockHeight on historical table', async () => {
    // children(blockHeight: "7", filter: { parentFilterParents: { every: { name: { startsWith: "parent" } } } })
    // At block 7, child_b ([5,10)) visible, child_a not visible
    // child_b's parents: parent_b (startsWith "parent") → all parents match → passes every
    const result = await runQuery(`
      {
        filterChildren(
          blockHeight: "7",
          filter: { parentFilterParents: { every: { name: { startsWith: "parent" } } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterChildren?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('child_b');
    expect(names).not.toContain('child_a');
  });

  /* ───────── filterBlockHeight override inside nested filter ───────── */

  it('filterBlockHeight overrides parent blockHeight in nested relation filter', async () => {
    // Parent: blockHeight "7" → only child_b visible
    // filterBlockHeight: "2" → override to block 2 → child_a visible instead
    // Result: parent_b (has child_b) NOT returned, parent_a (has child_a) returned
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "7",
          filter: {
            filterBlockHeight: "2",
            child: { name: { equalTo: "child_a" } }
          }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_a');
    expect(names).not.toContain('parent_b');
    expect(names).not.toContain('parent_default');
  });

  it('filterBlockHeight null does not affect parent blockHeight', async () => {
    // Parent: blockHeight "7" → only child_b visible
    // filterBlockHeight: null → no override, parent blockHeight inherited
    // Result: child_b filter match at block 7 → parent_b returned
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "7",
          filter: {
            filterBlockHeight: null,
            child: { name: { equalTo: "child_b" } }
          }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_b');
  });

  it('filterBlockHeight inside composite AND overrides parent', async () => {
    // Parent: blockHeight "7" (child_b visible, child_a not)
    // filter: { filterBlockHeight: "2", child: { name: { equalTo: "child_b" } } } and
    //         { filterBlockHeight: "2", child: { name: { equalTo: "child_a" } } }
    // At block 2: child_b not visible, child_a visible → AND fails → 0 results
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "7",
          filter: {
            and: [
              { filterBlockHeight: "2", child: { name: { equalTo: "child_b" } } },
              { filterBlockHeight: "2", child: { name: { equalTo: "child_a" } } }
            ]
          }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.filterParents?.nodes || [];
    expect(nodes).toHaveLength(0);
  });

  it('filterBlockHeight inside OR overrides parent blockHeight per-branch', async () => {
    // Parent: blockHeight "4" (child_a visible at [1,5), child_b NOT visible at [5,10))
    // filterBlockHeight "2" in first branch → child_a visible
    // filterBlockHeight "7" in second branch → child_b visible
    // OR → both parent_a and parent_b match
    const result = await runQuery(`
      {
        filterParents(
          blockHeight: "4",
          filter: {
            or: [
              { filterBlockHeight: "2", child: { name: { equalTo: "child_a" } } },
              { filterBlockHeight: "7", child: { name: { equalTo: "child_b" } } }
            ]
          }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterParents?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('parent_a');
    expect(names).toContain('parent_b');
  });

  it('none filter respects blockHeight on historical table', async () => {
    // children(blockHeight: "7", filter: { parentFilterParents: { none: { name: { equalTo: "parent_b" } } } })
    // At block 7, child_b visible → its parent parent_b matches → none fails → child_b excluded
    // child_a not visible at block 7 → excluded from results entirely
    const result = await runQuery(`
      {
        filterChildren(
          blockHeight: "7",
          filter: { parentFilterParents: { none: { name: { equalTo: "parent_b" } } } }
        ) {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const names = result.data?.filterChildren?.nodes?.map((n: any) => n.name) || [];
    // child_default has no parents via FK → none passes → included
    expect(names).toContain('child_default');
    // child_b's only parent is parent_b → none fails → excluded
    expect(names).not.toContain('child_b');
  });
});
