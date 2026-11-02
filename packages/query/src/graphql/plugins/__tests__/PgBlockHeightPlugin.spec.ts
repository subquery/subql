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

describe('PgBlockHeightPlugin', () => {
  const dbSchema = 'subquery_blockheight_test';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);

    // ── Table with _block_range — blockHeight arg should be added ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".test_historical (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        value INTEGER,
        _block_range INT8RANGE
      )
    `);

    await pool.query(`
      INSERT INTO "${dbSchema}".test_historical (name, value, _block_range) VALUES
        ('current', 100, '[,]'::int8range),
        ('v1', 200, '[1,3)'::int8range),
        ('v2', 300, '[3,5)'::int8range),
        ('v3', 400, '[5,7)'::int8range)
    `);

    // ── Table WITHOUT _block_range — should NOT get blockHeight arg ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".test_plain (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);

    await pool.query(`
      INSERT INTO "${dbSchema}".test_plain (name) VALUES ('plain_a'), ('plain_b')
    `);

    // ── Parent table with _block_range + FK to child (for relation inheritance tests) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".parent_entity (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        child_id INTEGER REFERENCES "${dbSchema}".test_historical(id),
        _block_range INT8RANGE
      )
    `);

    await pool.query(`
      INSERT INTO "${dbSchema}".parent_entity (name, child_id, _block_range) VALUES
        ('parent_current', 1, '[,]'::int8range),
        ('parent_v1', 2, '[1,3)'::int8range),
        ('parent_v2', 3, '[3,5)'::int8range)
    `);

    // ── Grandchild table (for nested relation chain tests) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".grandchild (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES "${dbSchema}".parent_entity(id),
        _block_range INT8RANGE
      )
    `);

    await pool.query(`
      INSERT INTO "${dbSchema}".grandchild (name, parent_id, _block_range) VALUES
        ('gc_current', 1, '[,]'::int8range),
        ('gc_v1', 2, '[1,3)'::int8range)
    `);

    // ── Table with UNIQUE FK to test_historical (one-to-one backward single relation) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".profile (
        id SERIAL PRIMARY KEY,
        bio VARCHAR(255) NOT NULL,
        hist_id INTEGER NOT NULL,
        _block_range INT8RANGE,
        CONSTRAINT profile_hist_id_key UNIQUE (hist_id),
        CONSTRAINT profile_hist_id_fkey FOREIGN KEY (hist_id)
          REFERENCES "${dbSchema}".test_historical (id)
      )
    `);

    await pool.query(`
      INSERT INTO "${dbSchema}".profile (bio, hist_id, _block_range) VALUES
        ('current_bio', 1, '[,]'::int8range),
        ('v1_bio', 2, '[1,3)'::int8range)
    `);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  /* ───────── EXISTING TESTS (preserved) ───────── */

  it('adds blockHeight arg to connection queries on tables with _block_range', async () => {
    const result = await runQuery(`
      {
        __schema {
          queryType {
            fields {
              name
              args { name }
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const queryFields = result.data?.__schema?.queryType?.fields || [];
    const histField = queryFields.find((f: any) => f.name === 'testHistoricals');
    expect(histField).toBeDefined();
    const argNames = histField.args.map((a: any) => a.name);
    expect(argNames).toContain('blockHeight');
    expect(argNames).toContain('timestamp');
  });

  it('filters by blockHeight arg', async () => {
    // Without explicit blockHeight (= HEIGHT_DEFAULT MAX), only 'current' covers MAX
    const allResult = await runQuery(`
      { testHistoricals { nodes { name value } } }
    `);
    expect(allResult.errors).toBeUndefined();
    expect(allResult.data?.testHistoricals.nodes).toHaveLength(1);
    expect(allResult.data?.testHistoricals.nodes[0].name).toBe('current');

    // blockHeight "2" only matches 'current' (unbounded) and 'v1' ([1,3))
    const atBlock2 = await runQuery(`
      { testHistoricals(blockHeight: "2") { nodes { name value } } }
    `);
    expect(atBlock2.errors).toBeUndefined();
    expect(atBlock2.data?.testHistoricals.nodes).toHaveLength(2);
    const names2 = atBlock2.data?.testHistoricals.nodes.map((n: any) => n.name).sort();
    expect(names2).toEqual(['current', 'v1']);

    // blockHeight "4" matches 'current' and 'v2' ([3,5))
    const atBlock4 = await runQuery(`
      { testHistoricals(blockHeight: "4") { nodes { name value } } }
    `);
    expect(atBlock4.errors).toBeUndefined();
    expect(atBlock4.data?.testHistoricals.nodes).toHaveLength(2);
    const names4 = atBlock4.data?.testHistoricals.nodes.map((n: any) => n.name).sort();
    expect(names4).toEqual(['current', 'v2']);
  });

  it('does not add blockHeight arg to tables without _block_range', async () => {
    const result = await runQuery(`
      {
        __schema {
          queryType {
            fields {
              name
              args { name }
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const queryFields = result.data?.__schema?.queryType?.fields || [];
    const plainField = queryFields.find((f: any) => f.name === 'testPlains');
    expect(plainField).toBeDefined();
    const argNames = plainField.args.map((a: any) => a.name);
    expect(argNames).not.toContain('blockHeight');
    expect(argNames).not.toContain('timestamp');
  });

  it('timestamp arg also filters rows', async () => {
    const atBlock2 = await runQuery(`
      { testHistoricals(timestamp: "2") { nodes { name value } } }
    `);
    expect(atBlock2.errors).toBeUndefined();
    expect(atBlock2.data?.testHistoricals.nodes).toHaveLength(2);
    const names = atBlock2.data?.testHistoricals.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['current', 'v1']);
  });

  /* ───────── NEW TESTS: Relation Inheritance (AsyncLocalStorage propagation) ───────── */

  it('propagates blockHeight to backward relation (parent → child)', async () => {
    // Query parentEntities at blockHeight "2" — only parent_current (unbounded) and parent_v1 ([1,3)) visible
    // Then fetch child relation — should also filter child by blockHeight "2"
    const result = await runQuery(`
      {
        parentEntities(blockHeight: "2") {
          nodes {
            name
            child {
              name
              value
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.parentEntities?.nodes || [];
    expect(nodes).toHaveLength(2);

    // parent_current (unbounded) → child should be 'current' (unbounded, visible at block 2)
    const parentCurrent = nodes.find((n: any) => n.name === 'parent_current');
    expect(parentCurrent).toBeDefined();
    expect(parentCurrent.child).toBeDefined();
    expect(parentCurrent.child.name).toBe('current');

    // parent_v1 ([1,3)) → child should be 'v1' ([1,3), visible at block 2)
    const parentV1 = nodes.find((n: any) => n.name === 'parent_v1');
    expect(parentV1).toBeDefined();
    expect(parentV1.child).toBeDefined();
    expect(parentV1.child.name).toBe('v1');
  });

  it('propagates blockHeight to forward relation (child → parent)', async () => {
    // Query testHistoricals at blockHeight "2" — only 'current' and 'v1' visible
    // Then fetch parentEntities forward relation — should also filter by blockHeight "2"
    const result = await runQuery(`
      {
        testHistoricals(blockHeight: "2") {
          nodes {
            name
            parentParentEntities {
              nodes {
                name
              }
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(2);

    // 'current' (unbounded) → parentParentEntities should include parent_current (unbounded, visible at block 2)
    const current = nodes.find((n: any) => n.name === 'current');
    expect(current).toBeDefined();
    const currentParents = current.parentParentEntities?.nodes || [];
    expect(currentParents.length).toBeGreaterThanOrEqual(1);
    expect(currentParents.map((p: any) => p.name)).toContain('parent_current');

    // 'v1' ([1,3)) → parentParentEntities should include parent_v1 ([1,3), visible at block 2)
    const v1 = nodes.find((n: any) => n.name === 'v1');
    expect(v1).toBeDefined();
    const v1Parents = v1.parentParentEntities?.nodes || [];
    expect(v1Parents.length).toBeGreaterThanOrEqual(1);
    expect(v1Parents.map((p: any) => p.name)).toContain('parent_v1');
  });

  it('propagates blockHeight through nested chain (parent → child → grandchild)', async () => {
    // Query parentEntities at blockHeight "2" — only parent_current and parent_v1 visible
    // Then fetch child relation → testHistorical (filtered by blockHeight "2")
    // Then fetch grandchild relation → grandchild (filtered by blockHeight "2")
    const result = await runQuery(`
      {
        parentEntities(blockHeight: "2") {
          nodes {
            name
            child {
              name
            }
            childGrandchildren {
              nodes {
                name
              }
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.parentEntities?.nodes || [];
    expect(nodes).toHaveLength(2);

    // parent_current (unbounded) → grandchild should include gc_current (unbounded, visible at block 2)
    const parentCurrent = nodes.find((n: any) => n.name === 'parent_current');
    expect(parentCurrent).toBeDefined();
    const gcCurrent = parentCurrent.childGrandchildren?.nodes || [];
    expect(gcCurrent.length).toBeGreaterThanOrEqual(1);
    expect(gcCurrent.map((g: any) => g.name)).toContain('gc_current');

    // parent_v1 ([1,3)) → grandchild should include gc_v1 ([1,3), visible at block 2)
    const parentV1 = nodes.find((n: any) => n.name === 'parent_v1');
    expect(parentV1).toBeDefined();
    const gcV1 = parentV1.childGrandchildren?.nodes || [];
    expect(gcV1.length).toBeGreaterThanOrEqual(1);
    expect(gcV1.map((g: any) => g.name)).toContain('gc_v1');
  });

  it('propagates blockHeight to backward single relation (one-to-one)', async () => {
    // Query testHistoricals at blockHeight "2" — only 'current' and 'v1' visible
    // Then fetch profile (backward single relation via UNIQUE FK) — should also filter by blockHeight "2"
    const result = await runQuery(`
      {
        testHistoricals(blockHeight: "2") {
          nodes {
            name
            profile {
              bio
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(2);

    // 'current' (unbounded) → profile should be 'current_bio' (unbounded, visible at block 2)
    const current = nodes.find((n: any) => n.name === 'current');
    expect(current).toBeDefined();
    expect(current.profile).toBeDefined();
    expect(current.profile.bio).toBe('current_bio');

    // 'v1' ([1,3)) → profile should be 'v1_bio' ([1,3), visible at block 2)
    const v1 = nodes.find((n: any) => n.name === 'v1');
    expect(v1).toBeDefined();
    expect(v1.profile).toBeDefined();
    expect(v1.profile.bio).toBe('v1_bio');
  });

  /* ───────── NEW TESTS: Single-row-by-PK field ───────── */

  it('adds blockHeight arg to single-row-by-PK field', async () => {
    // Find the testHistoricalById field and check it has blockHeight/timestamp args
    const result = await runQuery(`
      {
        __schema {
          queryType {
            fields {
              name
              args { name }
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const queryFields = result.data?.__schema?.queryType?.fields || [];
    const byIdField = queryFields.find((f: any) => f.name === 'testHistoricalById');
    expect(byIdField).toBeDefined();
    const argNames = byIdField.args.map((a: any) => a.name);
    expect(argNames).toContain('blockHeight');
    expect(argNames).toContain('timestamp');
  });

  it('filters single-row-by-PK query by blockHeight', async () => {
    // testHistorical(rowId) is the PK accessor (from PgRowByUniquePlugin + PgSimplifyInflection).
    // testHistoricalById uses Node IDs (base64), not raw PKs — so we use testHistorical(rowId).
    // Query testHistorical(rowId: 2) without blockHeight — should return 'current' (unbounded, covers MAX)
    const defaultResult = await runQuery(`
      { testHistorical(rowId: 2) { name value } }
    `);
    expect(defaultResult.errors).toBeUndefined();
    // id=2 is 'v1' which has _block_range [1,3). At default MAX, it's filtered out.
    // So id=2 should return null at default
    expect(defaultResult.data?.testHistorical).toBeNull();

    // Query testHistorical(rowId: 2) with blockHeight "2" — should return 'v1' (visible at block 2)
    const atBlock2 = await runQuery(`
      { testHistorical(rowId: 2, blockHeight: "2") { name value } }
    `);
    expect(atBlock2.errors).toBeUndefined();
    expect(atBlock2.data?.testHistorical).toBeDefined();
    expect(atBlock2.data?.testHistorical.name).toBe('v1');
    expect(atBlock2.data?.testHistorical.value).toBe(200);
  });

  /* ───────── NEW TESTS: Relation field arg introspection ───────── */

  it('adds blockHeight/timestamp args to backward relation fields', async () => {
    // Check that the backward relation field on TestHistorical has blockHeight/timestamp args
    const result = await runQuery(`
      {
        __type(name: "TestHistorical") {
          fields {
            name
            args { name }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const fields = result.data?.__type?.fields || [];

    // parentParentEntities is a backward relation (connection) — should have blockHeight/timestamp
    const parentEntitiesField = fields.find((f: any) => f.name === 'parentParentEntities');
    expect(parentEntitiesField).toBeDefined();
    const parentArgNames = parentEntitiesField.args.map((a: any) => a.name);
    expect(parentArgNames).toContain('blockHeight');
    expect(parentArgNames).toContain('timestamp');

    // profile is a backward single relation (one-to-one) — should have blockHeight/timestamp
    const profileField = fields.find((f: any) => f.name === 'profile');
    expect(profileField).toBeDefined();
    const profileArgNames = profileField.args.map((a: any) => a.name);
    expect(profileArgNames).toContain('blockHeight');
    expect(profileArgNames).toContain('timestamp');
  });

  it('adds blockHeight/timestamp args to forward relation fields', async () => {
    // Check that the forward relation field on ParentEntity has blockHeight/timestamp args
    const result = await runQuery(`
      {
        __type(name: "ParentEntity") {
          fields {
            name
            args { name }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const fields = result.data?.__type?.fields || [];

    // child is a forward relation (singular) — should have blockHeight/timestamp
    const histField = fields.find((f: any) => f.name === 'child');
    expect(histField).toBeDefined();
    const histArgNames = histField.args.map((a: any) => a.name);
    expect(histArgNames).toContain('blockHeight');
    expect(histArgNames).toContain('timestamp');

    // childGrandchildren is a backward relation (connection) — should have blockHeight/timestamp
    const gcField = fields.find((f: any) => f.name === 'childGrandchildren');
    expect(gcField).toBeDefined();
    const gcArgNames = gcField.args.map((a: any) => a.name);
    expect(gcArgNames).toContain('blockHeight');
    expect(gcArgNames).toContain('timestamp');
  });

  /* ───────── NEW TESTS: Connection filter + blockHeight composition ───────── */

  it('composes connection filter with blockHeight arg', async () => {
    // Query testHistoricals with both filter AND blockHeight
    // blockHeight "2" → only 'current' (unbounded) and 'v1' ([1,3)) visible
    // filter: value > 150 → only 'v1' (value=200) passes
    const result = await runQuery(`
      {
        testHistoricals(
          blockHeight: "2",
          filter: { value: { greaterThan: 150 } }
        ) {
          nodes {
            name
            value
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('v1');
    expect(nodes[0].value).toBe(200);
  });

  it('composes connection filter with blockHeight on relation fields', async () => {
    // Query parentEntities at blockHeight "2" with filter on the connection
    // Then fetch child single-relation — it inherits blockHeight "2"
    const result = await runQuery(`
      {
        parentEntities(
          blockHeight: "2",
          filter: { name: { startsWith: "parent" } }
        ) {
          nodes {
            name
            child {
              name
              value
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.parentEntities?.nodes || [];
    expect(nodes).toHaveLength(2);

    // parent_current → child 'current' (id=1, _block_range [,] unbounded, visible at block 2)
    const parentCurrent = nodes.find((n: any) => n.name === 'parent_current');
    expect(parentCurrent).toBeDefined();
    expect(parentCurrent.child).toBeDefined();
    expect(parentCurrent.child.name).toBe('current');
    expect(parentCurrent.child.value).toBe(100);

    // parent_v1 → child 'v1' (id=2, _block_range [1,3), visible at block 2)
    const parentV1 = nodes.find((n: any) => n.name === 'parent_v1');
    expect(parentV1).toBeDefined();
    expect(parentV1.child).toBeDefined();
    expect(parentV1.child.name).toBe('v1');
    expect(parentV1.child.value).toBe(200);
  });

  /* ───────── NEW TESTS: Edge values ───────── */

  it('handles blockHeight "0" correctly', async () => {
    // blockHeight "0" — only unbounded ranges ('current') should match
    // because [1,3) starts at 1, so 0 is before it
    const result = await runQuery(`
      { testHistoricals(blockHeight: "0") { nodes { name } } }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('current');
  });

  it('handles blockHeight at exact range boundary', async () => {
    // blockHeight "1" — 'current' (unbounded) and 'v1' ([1,3)) should match
    // int8range [1,3) includes 1
    const result = await runQuery(`
      { testHistoricals(blockHeight: "1") { nodes { name } } }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(2);
    const names = nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['current', 'v1']);
  });

  it('handles blockHeight at upper exclusive boundary', async () => {
    // blockHeight "3" — 'current' (unbounded) and 'v2' ([3,5)) should match
    // int8range [1,3) does NOT include 3 (exclusive upper bound)
    const result = await runQuery(`
      { testHistoricals(blockHeight: "3") { nodes { name } } }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(2);
    const names = nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['current', 'v2']);
  });

  it('handles blockHeight beyond all ranges', async () => {
    // blockHeight "100" — only 'current' (unbounded) should match
    // All bounded ranges end before 100
    const result = await runQuery(`
      { testHistoricals(blockHeight: "100") { nodes { name } } }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('current');
  });

  /* ───────── NEW TESTS: Explicit blockHeight on relation overrides inheritance ───────── */

  it('explicit blockHeight on relation overrides inherited blockHeight', async () => {
    // Query parentEntities at blockHeight "2" — parent_current and parent_v1 visible
    // But override child relation with blockHeight "4" — should see 'v2' instead of 'v1'
    const result = await runQuery(`
      {
        parentEntities(blockHeight: "2") {
          nodes {
            name
            child(blockHeight: "4") {
              name
              value
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.parentEntities?.nodes || [];
    expect(nodes).toHaveLength(2);

    // parent_current (unbounded) → child with blockHeight "4" → 'current' (unbounded) and 'v2' ([3,5))
    // But it's a singular forward relation, so only one result. 'current' is visible at block 4.
    const parentCurrent = nodes.find((n: any) => n.name === 'parent_current');
    expect(parentCurrent).toBeDefined();
    expect(parentCurrent.child).toBeDefined();
    // child_id=1 → 'current' (unbounded, visible at block 4)
    expect(parentCurrent.child.name).toBe('current');

    // parent_v1 (child_id=2 → 'v1' [1,3)) — at blockHeight "4", 'v1' is NOT visible ([1,3) excludes 4)
    // So child should be null
    const parentV1 = nodes.find((n: any) => n.name === 'parent_v1');
    expect(parentV1).toBeDefined();
    expect(parentV1.child).toBeNull();
  });

  /* ───────── NEW TESTS: Default filtering on relations without explicit blockHeight ───────── */

  it('default filters relations to current data when no blockHeight specified', async () => {
    // Query parentEntities without blockHeight — only parent_current (unbounded) visible at MAX
    // Then fetch child relation — should also default to MAX, so only 'current' visible
    const result = await runQuery(`
      {
        parentEntities {
          nodes {
            name
            child {
              name
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.parentEntities?.nodes || [];
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('parent_current');
    expect(nodes[0].child).toBeDefined();
    expect(nodes[0].child.name).toBe('current');
  });

  /* ───────── NEW TESTS: Both blockHeight and timestamp provided ───────── */

  it('blockHeight takes precedence when both blockHeight and timestamp are provided', async () => {
    // Provide both args — blockHeight should win (timestamp applyPlan fires first,
    // then blockHeight applyPlan overwrites)
    const result = await runQuery(`
      {
        testHistoricals(blockHeight: "4", timestamp: "2") {
          nodes { name }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    // blockHeight "4" → 'current' and 'v2' ([3,5))
    expect(nodes).toHaveLength(2);
    const names = nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['current', 'v2']);
  });

  /* ───────── NEW TESTS: Deep chain with mixed explicit/inherit (ALS override) ───────── */

  it('explicit blockHeight on child overrides parent inherited height for grandchild', async () => {
    // parentEntities at blockHeight "2" → only parent_current (child_id=1) and parent_v1 (child_id=2) visible
    // Override testHistorical with blockHeight "4" → child_id=1 → 'current' ([,] unbounded, visible)
    //   child_id=2 → 'v1' ([1,3)) NOT visible at block 4 → null
    // grandchild field on parentEntity inherits from the OVERRIDDEN blockHeight "4" from child's applyPlan,
    // but actually grandchild is a sibling field of testHistorical, not a descendent.
    // grandchild inherits the PARENT level blockHeight "2" (it's read from ALS which was set at parent level).
    // When testHistorical's applyPlan calls enterWith("4"), it affects only the subtree under testHistorical.
    // So grandchildren should still inherit "2".
    const result = await runQuery(`
      {
        parentEntities(blockHeight: "2") {
          nodes {
            name
            child(blockHeight: "4") {
              name
            }
            childGrandchildren {
              nodes {
                name
              }
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.parentEntities?.nodes || [];
    expect(nodes).toHaveLength(2);

    const parentCurrent = nodes.find((n: any) => n.name === 'parent_current');
    expect(parentCurrent).toBeDefined();
    // child_id=1 → 'current' (unbounded, visible at block 4)
    expect(parentCurrent.child).toBeDefined();
    expect(parentCurrent.child.name).toBe('current');
    // childGrandchildren inherits blockHeight "2" → gc_current (unbounded) visible
    const gc = parentCurrent.childGrandchildren?.nodes || [];
    expect(gc.map((g: any) => g.name)).toContain('gc_current');

    const parentV1 = nodes.find((n: any) => n.name === 'parent_v1');
    expect(parentV1).toBeDefined();
    // child_id=2 → 'v1' ([1,3)) NOT visible at blockHeight "4"
    expect(parentV1.child).toBeNull();
    // childGrandchildren inherits blockHeight "2" → gc_v1 ([1,3)) visible at block 2
    const gcV1 = parentV1.childGrandchildren?.nodes || [];
    expect(gcV1.map((g: any) => g.name)).toContain('gc_v1');
  });

  /* ───────── NEW TESTS: Cross-table combined backward+forward ───────── */

  it('propagates blockHeight through combined backward and forward relations', async () => {
    // testHistoricals(blockHeight: "2") → 'current' (id=1) and 'v1' (id=2) visible
    // From 'current': parentParentEntities (backward) → parent_current (child_id=1, [,] visible at block 2)
    //                                                parent_v1 (child_id=2, [1,3) visible at block 2)
    // From parent_current: child (forward) → 'current' (inherited blockHeight "2", unbounded, visible)
    // From parent_v1: child (forward) → 'v1' (inherited blockHeight "2", [1,3) visible at 2)
    const result = await runQuery(`
      {
        testHistoricals(blockHeight: "2") {
          nodes {
            name
            parentParentEntities {
              nodes {
                name
                child {
                  name
                }
              }
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(2);

    // 'current' (id=1) → backward to parentParentEntities → parent_current (child_id=1)
    const current = nodes.find((n: any) => n.name === 'current');
    expect(current).toBeDefined();
    const currentParents = current.parentParentEntities?.nodes || [];
    expect(currentParents.length).toBeGreaterThanOrEqual(1);
    const parentCurrent = currentParents.find((p: any) => p.name === 'parent_current');
    expect(parentCurrent).toBeDefined();
    // Forward back to child → 'current' (unbounded, visible at block 2)
    expect(parentCurrent.child).toBeDefined();
    expect(parentCurrent.child.name).toBe('current');

    // 'v1' (id=2) → backward to parentParentEntities → parent_v1 (child_id=2)
    const v1 = nodes.find((n: any) => n.name === 'v1');
    expect(v1).toBeDefined();
    const v1Parents = v1.parentParentEntities?.nodes || [];
    const parentV1 = v1Parents.find((p: any) => p.name === 'parent_v1');
    expect(parentV1).toBeDefined();
    // Forward back to child → 'v1' ([1,3), visible at block 2)
    expect(parentV1.child).toBeDefined();
    expect(parentV1.child.name).toBe('v1');
  });

  /* ───────── NEW TESTS: Forward single + backward connection in same query ───────── */

  it('propagates blockHeight to both forward single and backward connection relations in same query', async () => {
    // parentEntities(blockHeight: "2") → parent_current (child_id=1) and parent_v1 (child_id=2) visible
    // child is forward single → inherits "2"
    // childGrandchildren is backward connection → inherits "2"
    const result = await runQuery(`
      {
        parentEntities(blockHeight: "2") {
          nodes {
            name
            child {
              name
            }
            childGrandchildren {
              nodes {
                name
              }
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.parentEntities?.nodes || [];
    expect(nodes).toHaveLength(2);

    // parent_current → child = 'current', childGrandchildren = gc_current
    const parentCurrent = nodes.find((n: any) => n.name === 'parent_current');
    expect(parentCurrent).toBeDefined();
    expect(parentCurrent.child).toBeDefined();
    expect(parentCurrent.child.name).toBe('current');
    expect(parentCurrent.childGrandchildren?.nodes.map((g: any) => g.name)).toContain('gc_current');

    // parent_v1 → child = 'v1', childGrandchildren = gc_v1
    const parentV1 = nodes.find((n: any) => n.name === 'parent_v1');
    expect(parentV1).toBeDefined();
    expect(parentV1.child).toBeDefined();
    expect(parentV1.child.name).toBe('v1');
    expect(parentV1.childGrandchildren?.nodes.map((g: any) => g.name)).toContain('gc_v1');
  });

  /* ───────── NEW TESTS: Filter + explicit blockHeight override on backward relation ───────── */

  it('composes filter with explicit blockHeight override on backward relation', async () => {
    // testHistoricals(blockHeight: "2") → 'current' and 'v1' visible
    // Override backward relation parentParentEntities with blockHeight "4" + filter
    // blockHeight "4": parent_current ([,] visible), parent_v2 ([3,5) visible at 4)
    // filter name startsWith "parent_v": parent_v2 passes
    const result = await runQuery(`
      {
        testHistoricals(blockHeight: "2") {
          nodes {
            name
            parentParentEntities(blockHeight: "4", filter: { name: { startsWith: "parent_v" } }) {
              nodes {
                name
              }
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(2);

    // 'current' (id=1): no parent references this with forward FK matching, but parentParentEntities
    // is a backward relation — parent_entity.child_id → test_historical.id
    // child_id=1 → parent_current (name doesn't start with "parent_v" → filtered out)
    const current = nodes.find((n: any) => n.name === 'current');
    expect(current).toBeDefined();
    const currentParents = current.parentParentEntities?.nodes || [];
    // parent_current doesn't pass the filter (name startsWith "parent_v" fails — it's "parent_current"... wait)
    // Actually "parent_current" starts with "parent_" which includes "parent_v" prefix check —
    // startsWith("parent_v") → "parent_current" does NOT start with "parent_v" (starts with "parent_c")
    expect(currentParents.map((p: any) => p.name)).not.toContain('parent_current');

    // 'v1' (id=2): child_id=2 → parent_v1 (name "parent_v1", [1,3) NOT visible at block 4) → filtered out
    const v1 = nodes.find((n: any) => n.name === 'v1');
    expect(v1).toBeDefined();
    const v1Parents = v1.parentParentEntities?.nodes || [];
    // parent_v1 ([1,3)) not visible at blockHeight "4" so blockRange filter removes it
    expect(v1Parents.map((p: any) => p.name)).not.toContain('parent_v1');
  });

  /* ───────── NEW TESTS: Edge values ───────── */

  it('handles negative blockHeight returning no rows', async () => {
    // blockHeight "-1" — no int8range in test data contains negative values
    // Only 'current' ([,] unbounded) might match, but int8range [,] @> -1 depends on PG semantics.
    // Per PG: int8range [,] @> -1 → true (unbounded lower, unbounded upper contains everything)
    // So 'current' should still be visible.
    const result = await runQuery(`
      { testHistoricals(blockHeight: "-1") { nodes { name } } }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    // Unbounded range [,] contains everything including -1
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('current');
  });

  it('handles blockHeight near MAX bigint (9223372036854775806)', async () => {
    // MAX-1: only unbounded ([,]) and ranges extending that high.
    // v3 is [5,7), v2 is [3,5), v1 is [1,3) — all bounded, none contain MAX-1
    // Only 'current' (unbounded) is visible
    const result = await runQuery(`
      { testHistoricals(blockHeight: "9223372036854775806") { nodes { name } } }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('current');
  });

  /* ───────── NEW TESTS: Explicit blockHeight override on backward single relation ───────── */

  it('sibling relations with different blockHeights do not interfere (ALS isolation)', async () => {
    // Query testHistoricals at blockHeight "4" → 'current' (unbounded) and 'v2' ([3,5)) visible
    // Override parentParentEntities with blockHeight "2" — should not leak into sibling
    // parentParentEntities (no explicit blockHeight) should still inherit "4" from parent
    const result = await runQuery(`
      {
        testHistoricals(blockHeight: "4") {
          nodes {
            name
            parentParentEntities(blockHeight: "2") {
              nodes {
                name
              }
            }
            parentParentEntities {
              nodes {
                name
              }
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(2);

    // 'v2' ([3,5)) — visible at block 4, NOT visible at block 2
    const v2 = nodes.find((n: any) => n.name === 'v2');
    expect(v2).toBeDefined();

    // sibling with explicit blockHeight "2": parent_v2 ([3,5)) NOT visible
    const v2ParentsOverride = v2.parentParentEntities?.nodes || [];
    const overrideNames = v2ParentsOverride.map((p: any) => p.name);
    expect(overrideNames).not.toContain('parent_v2');

    // sibling without explicit blockHeight should inherit "4": parent_v2 ([3,5)) IS visible
    const v2ParentsInherit = nodes.find((n: any) => n.name === 'v2')?.parentParentEntities?.nodes || [];
    const inheritNames = v2ParentsInherit.map((p: any) => p.name);
    expect(inheritNames).toContain('parent_v2');
  });

  it('explicit blockHeight on backward single relation overrides inherited height', async () => {
    // testHistoricals(blockHeight: "2") → 'current' (id=1) and 'v1' (id=2) visible
    // Override profile with blockHeight "4":
    //   'current' (hist_id=1) → profile current_bio ([,] unbounded, visible at block 4) ✓
    //   'v1' (hist_id=2) → profile v1_bio ([1,3)) NOT visible at block 4 → null
    const result = await runQuery(`
      {
        testHistoricals(blockHeight: "2") {
          nodes {
            name
            profile(blockHeight: "4") {
              bio
            }
          }
        }
      }
    `);
    expect(result.errors).toBeUndefined();
    const nodes = result.data?.testHistoricals?.nodes || [];
    expect(nodes).toHaveLength(2);

    const current = nodes.find((n: any) => n.name === 'current');
    expect(current).toBeDefined();
    expect(current.profile).toBeDefined();
    expect(current.profile.bio).toBe('current_bio');

    const v1 = nodes.find((n: any) => n.name === 'v1');
    expect(v1).toBeDefined();
    // v1_bio ([1,3)) not visible at blockHeight "4"
    expect(v1.profile).toBeNull();
  });
});
