// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {hashName} from '@subql/utils';
import {makeSchema} from 'postgraphile';
import {makePgService} from 'postgraphile/@dataplan/pg/adaptors/pg';
import {grafast} from 'postgraphile/grafast';
import {queryPreset} from '../index';
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

describe('PgSubscriptionPlugin (schema generation)', () => {
  const dbSchema = 'subquery_subscription_test';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);

    // Simple table — PgSubscriptionPlugin should generate subscription fields for it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".event (
        id TEXT NOT NULL,
        name TEXT,
        CONSTRAINT event_pkey PRIMARY KEY (id)
      )
    `);

    // _metadata table — should be SKIPPED by the plugin
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"._metadata (
        id TEXT NOT NULL,
        key TEXT,
        CONSTRAINT metadata_pkey PRIMARY KEY (id)
      )
    `);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  /* ───────── MutationType ENUM ───────── */

  it('defines MutationType enum with INSERT, UPDATE, DELETE values', async () => {
    const result = await runQuery(`
      {
        __type(name: "MutationType") {
          kind
          enumValues { name }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const enumType = result.data?.__type;
    expect(enumType).toBeDefined();
    expect(enumType.kind).toBe('ENUM');
    const names = enumType.enumValues?.map((v: any) => v.name) ?? [];
    expect(names).toContain('INSERT');
    expect(names).toContain('UPDATE');
    expect(names).toContain('DELETE');
  });

  /* ───────── SUBSCRIPTION FIELDS ───────── */

  it('creates subscription field for non-metadata, non-unique, non-parameterized table', async () => {
    const result = await runQuery(`
      {
        __type(name: "Subscription") {
          fields {
            name
            args {
              name
              type {
                name
                kind
                ofType { name kind }
              }
            }
            type { name kind }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const fields: Array<{name: string; args: any[]; type: any}> = result.data?.__type?.fields ?? [];

    // PgSimplifyInflectionPreset: "event" → plural "events"
    const eventsField = fields.find((f) => f.name === 'events');
    expect(eventsField).toBeDefined();

    // Should have `id` and `mutation` filter args
    const idArg = eventsField!.args.find((a: any) => a.name === 'id');
    expect(idArg).toBeDefined();

    const mutationArg = eventsField!.args.find((a: any) => a.name === 'mutation');
    expect(mutationArg).toBeDefined();
  });

  /* ───────── PAYLOAD TYPE ───────── */

  it('creates payload type with id, mutation_type, _entity fields', async () => {
    const result = await runQuery(`
      {
        __type(name: "EventPayload") {
          fields {
            name
            type { name kind ofType { name kind } }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const fields: Array<{name: string; type: any}> = result.data?.__type?.fields ?? [];

    const fieldNames = fields.map((f) => f.name);
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('mutation_type');
    expect(fieldNames).toContain('_entity');

    // _entity should be of type Event (nullable)
    const entityField = fields.find((f) => f.name === '_entity');
    expect(entityField?.type?.name ?? entityField?.type?.ofType?.name).toBe('Event');
  });

  it('excludes _metadata tables from subscription fields', async () => {
    const result = await runQuery(`
      {
        __type(name: "Subscription") {
          fields { name }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const fieldNames: string[] = result.data?.__type?.fields?.map((f: any) => f.name) ?? [];

    // _metadata is excluded by the plugin's codec.name check
    // But also excluded by pgSmartTags (-select -connection etc.)
    // Either way, no subscription for _metadata
    expect(fieldNames).not.toContain('_metadata');
    expect(fieldNames).not.toContain('_allMetadata');
  });
});

// ── Subscription execution tests (using real PostgreSQL NOTIFY) ──────

/**
 * Real NOTIFY-based subscription tests.  We let the normal PgContextPlugin
 * auto-create a real PgSubscriber, then send NOTIFY commands directly to
 * PostgreSQL.  This tests the full stack: listen() → jsonParse → filter →
 * _entity DB lookup.
 */

describe('PgSubscriptionPlugin (execution)', () => {
  const dbSchema = 'subquery_subscription_exec_test';
  const {pool} = createTestContext(dbSchema);

  // Topic hash — must match PgSubscriptionPlugin logic:
  // hashName(resource.namespace ?? 'public', 'notify_channel', codec.name)
  const normTopic = hashName(dbSchema, 'notify_channel', 'exec_item');
  const histTopic = hashName(dbSchema, 'notify_channel', 'historical_item');

  let insertedId: string;

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".exec_item (
        id TEXT NOT NULL,
        name TEXT,
        CONSTRAINT exec_item_pkey PRIMARY KEY (id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".historical_item (
        _id TEXT NOT NULL,
        id SERIAL,
        name TEXT,
        _block_range INT8RANGE NOT NULL DEFAULT '[0,)',
        CONSTRAINT historical_item_pkey PRIMARY KEY (_id)
      )
    `);

    const insert = await pool.query(`INSERT INTO "${dbSchema}".exec_item (id, name) VALUES ($1, $2) RETURNING id`, [
      'exec-1',
      'test entity',
    ]);
    insertedId = insert.rows[0].id;

    await pool.query(`INSERT INTO "${dbSchema}".historical_item (_id, name, _block_range) VALUES ($1, $2, $3)`, [
      'hist-uuid-1',
      'historical entity',
      '[1,100)',
    ]);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  async function startSubscription(query: string) {
    const preset = {
      ...queryPreset,
      pgServices: [makePgService({pool, schemas: [dbSchema]})],
      gather: {pgFakeConstraintsAutofixForeignKeyUniqueness: true},
    };
    const {resolvedPreset, schema} = await makeSchema(preset as any);
    return grafast({
      resolvedPreset,
      schema,
      source: query,
      contextValue: {pgClient: pool},
      requestContext: {pgClient: pool},
    }) as any;
  }

  it('receives events and resolves _entity by id lookup', async () => {
    const result = await startSubscription(`
      subscription { exec_items { id mutation_type _entity { ... on ExecItem { id name } } } }
    `);

    expect(result).toBeDefined();
    const iterable = result?.data?.exec_items ?? result;
    const iterator = iterable[Symbol.asyncIterator]?.();
    expect(iterator).toBeDefined();

    await pool.query(
      `NOTIFY "${normTopic}", '{"id":"exec_item:exec-1","mutation_type":"INSERT","_entity":{"id":"exec-1"}}'`
    );

    const {value} = await iterator.next();
    expect(value).toBeDefined();
    expect(value.data?.exec_items?.id).toBe('exec_item:exec-1');
    expect(value.data?.exec_items?.mutation_type).toBe('INSERT');
    expect(value.data?.exec_items?._entity?.id).toBe('exec-1');
    expect(value.data?.exec_items?._entity?.name).toBe('test entity');
  });

  it('resolves _entity with _block_height via _id and block range', async () => {
    const result = await startSubscription(`
      subscription { historical_items { id mutation_type _entity { ... on HistoricalItem { id name } } } }
    `);

    const iterable = result?.data?.historical_items ?? result;
    const iterator = iterable[Symbol.asyncIterator]?.();
    expect(iterator).toBeDefined();

    await pool.query(
      `NOTIFY "${histTopic}", '{"id":"historical_item:hist-uuid-1","mutation_type":"UPDATE","_entity":{"_id":"hist-uuid-1","id":1},"_block_height":50}'`
    );

    const {value} = await iterator.next();
    expect(value).toBeDefined();
    expect(value.data?.historical_items?.mutation_type).toBe('UPDATE');
    expect(value.data?.historical_items?._entity?.id).toBe(1);
    expect(value.data?.historical_items?._entity?.name).toBe('historical entity');
  });

  it('_entity returns null for non-existent id', async () => {
    const result = await startSubscription(`
      subscription { exec_items { id mutation_type _entity { ... on ExecItem { id name } } } }
    `);

    const iterable = result?.data?.exec_items ?? result;
    const iterator = iterable[Symbol.asyncIterator]?.();
    expect(iterator).toBeDefined();

    await pool.query(
      `NOTIFY "${normTopic}", '{"id":"exec_item:missing","mutation_type":"DELETE","_entity":{"id":"does-not-exist"}}'`
    );

    const {value} = await iterator.next();
    expect(value.errors?.[0]?.message).toBeUndefined();
    expect(value.data?.exec_items?._entity).toBeNull();
  });

  it('_block_height outside range returns null', async () => {
    const result = await startSubscription(`
      subscription { historical_items { id mutation_type _entity { ... on HistoricalItem { id name } } } }
    `);

    const iterable = result?.data?.historical_items ?? result;
    const iterator = iterable[Symbol.asyncIterator]?.();
    expect(iterator).toBeDefined();

    await pool.query(
      `NOTIFY "${histTopic}", '{"id":"historical_item:hist-uuid-1","mutation_type":"UPDATE","_entity":{"_id":"hist-uuid-1","id":1},"_block_height":999}'`
    );

    const {value} = await iterator.next();
    expect(value.errors?.[0]?.message).toBeUndefined();
    expect(value.data?.historical_items?._entity).toBeNull();
  });

  it('non-historical event ignores _block_height field', async () => {
    const result = await startSubscription(`
      subscription { exec_items { id mutation_type _entity { ... on ExecItem { id name } } } }
    `);

    const iterable = result?.data?.exec_items ?? result;
    const iterator = iterable[Symbol.asyncIterator]?.();
    expect(iterator).toBeDefined();

    await pool.query(
      `NOTIFY "${normTopic}", '{"id":"exec_item:exec-1","mutation_type":"INSERT","_entity":{"id":"exec-1"},"_block_height":100}'`
    );

    const {value} = await iterator.next();
    expect(value.errors?.[0]?.message).toBeUndefined();
    expect(value.data?.exec_items?._entity?.id).toBe('exec-1');
    expect(value.data?.exec_items?._entity?.name).toBe('test entity');
  });
});
