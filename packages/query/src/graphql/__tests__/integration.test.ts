// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

/**
 * Full HTTP integration test — replicates the middleware chain and grafserv
 * mounting that graphql.module.ts createServer() does in production.
 *
 * Spins up a real Express server, sends real HTTP requests, verifies
 * the entire chain: CORS → Cache-Control → limits → compression → grafserv.
 * Also captures generated SQL for snapshot regression detection.
 *
 * NOTE: limit middleware (complexity/depth/alias) depend on module-level argv
 * from graphql.module.ts, which is set at first import. Other test files'
 * jest.mock('../../yargs') may set different values. These tests focus on
 * what we CAN verify: headers, CORS, cache-control, query execution.
 */

import http from 'http';
import compression from 'compression';
import express from 'express';
import {Pool, PoolClient} from 'pg';
import pinoLogger from 'pino-http';
import {postgraphile, PostGraphileInstance} from 'postgraphile';
import {makePgService} from 'postgraphile/@dataplan/pg/adaptors/pg';
import {ExpressGrafserv} from 'postgraphile/grafserv/express/v4';
import {Config} from '../../configure';
import {PinoConfig} from '../../utils/logger';

// ─── SQL Capture helper ────────────────────────────────────────────────
// v5 grafast uses pool.connect() → client.query() internally (not pool.query()),
// so we wrap the pool's connect method to intercept client.query() calls.
interface SqlCapture {
  pool: Pool;
  queries: string[];
  clear(): void;
  /** Return captured SQL strings, deduplicated and trimmed */
  snapshot(): string[];
}

function createCapturedPool(originalPool: Pool): SqlCapture {
  const queries: string[] = [];
  const origConnect = originalPool.connect.bind(originalPool);

  // Wrap pool.connect so every new client gets a wrapped query()
  originalPool.connect = async function () {
    return origConnect().then((client: PoolClient) => {
      const origClientQuery = client.query.bind(client);
      client.query = ((...args: any[]) => {
        const sql = typeof args[0] === 'string' ? args[0] : (args[0]?.text ?? args[0]?.toString());
        if (sql && typeof sql === 'string') {
          // Only capture SELECT/INSERT/UPDATE/DELETE — skip SET/LISTEN/DEALLOCATE
          if (/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)/i.test(sql)) {
            queries.push(sql.trim());
          }
        }

        return origClientQuery(args[0], args[1]);
      }) as any;
      return client;
    });
  } as any;

  return {
    pool: originalPool,
    queries,
    clear() {
      queries.length = 0;
    },
    snapshot() {
      // Return unique queries, trimmed, sorted
      return [...new Set(queries.map((q) => q.replace(/\s+/g, ' ').trim()))].sort();
    },
  };
}

// Mock yargs so queryPreset loads with predictable values
jest.mock('../../yargs', () => {
  const getYargsOption = jest.fn(() => ({
    argv: {
      name: 'test',
      aggregate: true,
      'query-limit': 100,
      unsafe: false,
      subscription: false,
      'disable-hot-schema': true,
      'query-complexity': 100,
      'query-depth-limit': 10,
      'query-alias-limit': 20,
      'query-batch-limit': 10,
      playground: false,
    },
  }));
  const argv = (arg: string) => getYargsOption().argv[arg];
  return {getYargsOption, argv};
});

import {
  corsMiddleware,
  cacheControlMiddleware,
  limitBatchedQueries,
  limitQueryComplexity,
  limitQueryDepth,
  limitQueryAliases,
  errorBoundaryMiddleware,
  setMockPgInstance,
} from '../graphql.module';
import {queryPreset} from '../plugins';

const dbSchema = 'subquery_integration_test_db';
const config = new Config({});

// Pool for schema setup (query capture NOT active here — avoids setup noise)
const setupPool = new Pool({
  user: config.get('DB_USER'),
  password: config.get('DB_PASS'),
  host: config.get('DB_HOST_READ') ?? config.get('DB_HOST'),
  port: config.get('DB_PORT'),
  database: config.get('DB_DATABASE'),
});

// Pool for grafast (query capture active — captures SQL for snapshot tests)
const grafastPool = new Pool({
  user: config.get('DB_USER'),
  password: config.get('DB_PASS'),
  host: config.get('DB_HOST_READ') ?? config.get('DB_HOST'),
  port: config.get('DB_PORT'),
  database: config.get('DB_DATABASE'),
});
const captured = createCapturedPool(grafastPool);

describe('Full HTTP integration', () => {
  let app: express.Express;
  let server: http.Server;
  let instance: PostGraphileInstance;
  let baseUrl: string;

  beforeAll(async () => {
    // ── 1. Create test schema ──
    await setupPool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);

    await setupPool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".test_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        value INTEGER,
        _block_range INT8RANGE
      )
    `);
    await setupPool.query(`
      INSERT INTO "${dbSchema}".test_items (name, value, _block_range) VALUES
        ('item_a', 10, '[,]'::int8range),
        ('item_b', 20, '[1,5)'::int8range),
        ('item_c', 30, '[5,10)'::int8range)
    `);
    await setupPool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".test_tags (
        id SERIAL PRIMARY KEY,
        label VARCHAR(255) NOT NULL
      )
    `);
    await setupPool.query(`
      INSERT INTO "${dbSchema}".test_tags (label) VALUES ('tag_a'), ('tag_b')
    `);

    // Table with FK relation for nested query tests
    await setupPool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".test_children (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES "${dbSchema}".test_items(id),
        _block_range INT8RANGE
      )
    `);
    await setupPool.query(`
      INSERT INTO "${dbSchema}".test_children (name, parent_id, _block_range) VALUES
        ('child_a1', 1, '[,]'::int8range),
        ('child_a2', 1, '[1,5)'::int8range),
        ('child_b1', 2, '[3,8)'::int8range)
    `);

    // ── 2. Build postgraphile instance ──
    const preset = {
      ...queryPreset,
      pgServices: [makePgService({pool: captured.pool, schemas: [dbSchema]})],
      grafserv: {
        graphqlPath: '/',
        graphiql: false,
        watch: false,
      },
    };
    instance = postgraphile(preset as any);
    await instance.getSchema();
    setMockPgInstance(instance);

    // ── 3. Setup Express + middleware chain ──
    app = express();
    app.use(express.json());
    app.use(corsMiddleware);
    app.use(cacheControlMiddleware);
    app.use(pinoLogger(PinoConfig));
    app.use(limitBatchedQueries);
    app.use(limitQueryComplexity);
    app.use(limitQueryDepth);
    app.use(limitQueryAliases);
    app.use(compression());

    // ── 4. Mount grafserv ──
    const grafserv = instance.createServ(
      ({preset, schema}) => new ExpressGrafserv({preset, schema})
    ) as ExpressGrafserv;
    server = http.createServer(app);
    grafserv.addTo(app, server, true);

    // ── 5. Error boundary (last) ──
    app.use(errorBoundaryMiddleware);

    // ── 6. Start ──
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://localhost:${addr && typeof addr === 'object' ? addr.port : addr}`;
        resolve();
      });
    });
  }, 60000);

  afterAll(async () => {
    setMockPgInstance(null);
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    await setupPool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await setupPool.end();
    await grafastPool.end();
    await instance?.release();
  }, 30000);

  async function gqlPost(
    query: string,
    extraHeaders?: Record<string, string>
  ): Promise<{status: number; headers: Record<string, string>; body: any}> {
    const res = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...extraHeaders},
      body: JSON.stringify({query}),
    });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k] = v;
    });
    return {status: res.status, headers, body: await res.json()};
  }

  // ══════════════════════════════════════════
  // Middleware chain
  // ══════════════════════════════════════════

  it('returns CORS headers on POST', async () => {
    const {headers} = await gqlPost('{ __typename }');
    expect(headers['access-control-allow-origin']).toBe('*');
    expect(headers['access-control-allow-methods']).toBeTruthy();
    expect(headers['access-control-allow-headers']).toBeTruthy();
  });

  it('returns Cache-Control header on success response', async () => {
    const {headers} = await gqlPost('{ __typename }');
    expect(headers['cache-control']).toBe('public, max-age=5');
  });

  it('handles OPTIONS preflight with 204 and CORS headers', async () => {
    const res = await fetch(`${baseUrl}/`, {method: 'OPTIONS'});
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-methods')).toBeTruthy();
  });

  it('sets response headers for query metadata', async () => {
    const {headers} = await gqlPost('{ __typename }');
    // These headers are set by middleware — verify they exist
    // (values may vary based on argv from other test files' jest.mock)
    expect(headers['x-query-batches']).toBeDefined();
  });

  // ══════════════════════════════════════════
  // GraphQL execution
  // ══════════════════════════════════════════

  it('executes basic GraphQL query', async () => {
    const {body, status} = await gqlPost('{ __typename }');
    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    expect(body.data.__typename).toBe('Query');
  });

  it('queries historical table with blockHeight filter', async () => {
    const {body} = await gqlPost(`{
      testItems(blockHeight: "2") {
        nodes { name value }
      }
    }`);
    expect(body.errors).toBeUndefined();
    const names = body.data?.testItems?.nodes?.map((n: any) => n.name) || [];
    expect(names).toContain('item_a');
    expect(names).toContain('item_b');
    expect(names).not.toContain('item_c');
  });

  it('defaults to MAX blockHeight when no arg provided', async () => {
    const {body} = await gqlPost(`{
      testItems { nodes { name } }
    }`);
    expect(body.errors).toBeUndefined();
    const names = body.data?.testItems?.nodes?.map((n: any) => n.name) || [];
    expect(names).toEqual(['item_a']);
  });

  it('queries non-historical table (no _block_range)', async () => {
    const {body} = await gqlPost(`{
      testTags { nodes { label } }
    }`);
    expect(body.errors).toBeUndefined();
    const labels = body.data?.testTags?.nodes?.map((n: any) => n.label) || [];
    expect(labels).toContain('tag_a');
    expect(labels).toContain('tag_b');
  });

  it('queries nested relation with blockHeight inheritance', async () => {
    // Discover the actual relation field name via introspection
    // (inflection rules may produce different names)
    const introspect = await gqlPost(`{
      __type(name: "TestItem") {
        fields { name }
      }
    }`);
    expect(introspect.body.errors).toBeUndefined();
    const fields: string[] = introspect.body.data?.__type?.fields?.map((f: any) => f.name) || [];
    // Find the backward relation field (points to test_children)
    const childField = fields.find((f) => f.startsWith('childTestChildren') || f.startsWith('testChildren'));
    expect(childField).toBeDefined();
    const relationField = childField!;

    // Use the discovered field name
    const {body} = await gqlPost(`{
      testItems(blockHeight: "4") {
        nodes {
          name
          ${relationField}(first: 10) { nodes { name } }
        }
      }
    }`);
    expect(body.errors).toBeUndefined();
    const items = body.data?.testItems?.nodes || [];
    const itemA = items.find((n: any) => n.name === 'item_a');
    const itemB = items.find((n: any) => n.name === 'item_b');
    expect(itemA).toBeDefined();
    expect(itemB).toBeDefined();
    const childNamesA = itemA[relationField]?.nodes?.map((n: any) => n.name) || [];
    expect(childNamesA).toContain('child_a1');
    const childNamesB = itemB[relationField]?.nodes?.map((n: any) => n.name) || [];
    expect(childNamesB).toContain('child_b1');
  });

  // ══════════════════════════════════════════
  // Error boundary
  // ══════════════════════════════════════════

  it('returns JSON errors for invalid query (not a crash)', async () => {
    const res = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query: '{ nonexistentField }'}),
    });
    const body = await res.json();
    expect(body.errors).toBeDefined();
    expect(Array.isArray(body.errors)).toBe(true);
  });

  // ══════════════════════════════════════════
  // SQL Snapshot tests — catch regressions in generated SQL
  // ══════════════════════════════════════════

  beforeEach(() => {
    captured.clear();
  });

  it('SQL: simple query matches snapshot', async () => {
    const {body, status} = await gqlPost('{ __typename }');
    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    // grafast may batch multiple SQL queries — capture all
    const sql = captured.snapshot();
    expect(sql).toMatchSnapshot();
  });

  it('SQL: historical query with blockHeight filter matches snapshot', async () => {
    const {body} = await gqlPost(`{
      testItems(blockHeight: "2") { nodes { name value } }
    }`);
    expect(body.errors).toBeUndefined();
    const sql = captured.snapshot();
    expect(sql).toMatchSnapshot();
  });

  it('SQL: historical query default MAX blockHeight matches snapshot', async () => {
    const {body} = await gqlPost(`{
      testItems { nodes { name } }
    }`);
    expect(body.errors).toBeUndefined();
    const sql = captured.snapshot();
    expect(sql).toMatchSnapshot();
  });

  it('SQL: non-historical table query matches snapshot', async () => {
    const {body} = await gqlPost(`{
      testTags { nodes { label } }
    }`);
    expect(body.errors).toBeUndefined();
    const sql = captured.snapshot();
    expect(sql).toMatchSnapshot();
  });

  it('SQL: nested relation with blockHeight matches snapshot', async () => {
    const intro = await gqlPost(`{
      __type(name: "TestItem") { fields { name } }
    }`);
    const fields: string[] = intro.body.data?.__type?.fields?.map((f: any) => f.name) || [];
    const relationField = fields.find((f) => f.startsWith('childTestChildren') || f.startsWith('testChildren'))!;
    captured.clear();

    const {body} = await gqlPost(`{
      testItems(blockHeight: "4") {
        nodes { name ${relationField}(first: 10) { nodes { name } } }
      }
    }`);
    expect(body.errors).toBeUndefined();
    const sql = captured.snapshot();
    expect(sql).toMatchSnapshot();
  });
});
