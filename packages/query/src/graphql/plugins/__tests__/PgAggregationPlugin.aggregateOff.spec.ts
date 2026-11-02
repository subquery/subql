// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {createTestContext} from './testHelpers';

// Separate file because jest.mock is hoisted per-file — module scope set once at import
jest.mock('../../../yargs', () => {
  const getYargsOption = jest.fn(() => ({
    argv: {
      name: 'test',
      aggregate: false,
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

describe('PgAggregationPlugin with --aggregate flag off', () => {
  const dbSchema = 'subquery_aggregation_off_test';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".item (
        id SERIAL PRIMARY KEY,
        value INTEGER
      )
    `);
    await pool.query(`
      INSERT INTO "${dbSchema}".item (value) VALUES (10), (20), (30)
    `);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  it('should not expose aggregates field on table connection', async () => {
    // When --aggregate is off, pgAggregateSpecs and pgAggregateGroupBySpecs are cleared
    // to empty arrays by PgAggregateTextCastPlugin.init -> the aggregates field should not exist
    const result = await runQuery(`
      { __type(name: "ItemsConnection") { fields { name } } }
    `);
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.fields?.map((f: any) => f.name) || [];
    expect(fieldNames).not.toContain('aggregates');
    expect(fieldNames).not.toContain('groupedAggregates');
  });

  it('should not expose aggregate aggregate types in schema', async () => {
    const result = await runQuery(`
      { __schema { types { name } } }
    `);
    expect(result.errors).toBeUndefined();
    const typeNames = result.data?.__schema?.types?.map((t: any) => t.name) || [];
    // Aggregate-related types should not exist when --aggregate is off
    expect(typeNames).not.toContain('ItemAggregateValues');
    expect(typeNames).not.toContain('ItemAggregate');
    expect(typeNames).not.toContain('ItemGroupedAggregate');
  });

  it('basic query still works when aggregate is off', async () => {
    const result = await runQuery(`
      { items { nodes { value } } }
    `);
    expect(result.errors).toBeUndefined();
    const values = result.data?.items?.nodes?.map((n: any) => n.value) || [];
    expect(values).toEqual([10, 20, 30]);
  });
});
