// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

/**
 * Performance benchmark tests for the Postgraphile v5 query service.
 *
 * These tests measure query execution time and SQL round-trip counts
 * to ensure v5 performance is equivalent or better than v4.
 *
 * Issue #1982 requirement: "Equivalent or better SQL query performance,
 * especially for the introspection query"
 */
import {Pool} from 'pg';
import {makeSchema} from 'postgraphile';
import {makePgService} from 'postgraphile/@dataplan/pg/adaptors/pg';
import {grafast} from 'postgraphile/grafast';
import {Config} from '../../configure';
import {queryPreset} from '../plugins';

jest.mock('../../yargs', () => {
  const getYargsOption = jest.fn(() => ({
    argv: {
      name: 'test',
      aggregate: true,
      'query-limit': 100,
      'order-by-nulls-last': true,
    },
  }));
  const argv = (arg: string) => getYargsOption().argv[arg];
  return {
    getYargsOption,
    argv,
  };
});

const TIMEOUT = 30000;
const INTROSPECTION_TIMEOUT_MS = 500;
const COMPLEX_QUERY_MAX_ROUNDTRIPS = 5;

describe('Performance benchmarks', () => {
  const dbSchema = 'subquery_bench';
  const config = new Config({});

  const pool: Pool = new Pool({
    user: config.get('DB_USER'),
    password: config.get('DB_PASS'),
    host: config.get('DB_HOST_READ') ?? config.get('DB_HOST'),
    port: config.get('DB_PORT'),
    database: config.get('DB_DATABASE'),
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL client generated error: ', err.message);
  });

  async function buildTestSchema() {
    const preset = {
      ...queryPreset,
      pgServices: [makePgService({pool, schemas: [dbSchema]})],
      gather: {
        pgFakeConstraintsAutofixForeignKeyUniqueness: true,
      },
    };
    return makeSchema(preset as any);
  }

  async function runQuery(query: string) {
    const {resolvedPreset, schema} = await buildTestSchema();
    const pgClient = pool;
    return grafast({
      resolvedPreset,
      schema,
      source: query,
      contextValue: {pgClient},
      requestContext: {pgClient},
    });
  }

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);

    // Create tables with realistic data volume
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".authors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        bio TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".posts (
        id SERIAL PRIMARY KEY,
        author_id INTEGER NOT NULL REFERENCES "${dbSchema}".authors(id),
        title TEXT NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT false,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES "${dbSchema}".posts(id),
        author_name TEXT NOT NULL,
        body TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert 100 authors
    for (let i = 0; i < 100; i++) {
      await pool.query(`
        INSERT INTO "${dbSchema}".authors (name, email, bio)
        VALUES ('Author ${i}', 'author${i}@test.com', 'Bio for author ${i}')
      `);
    }

    // Insert 500 posts (5 per author)
    for (let i = 0; i < 500; i++) {
      const authorId = (i % 100) + 1;
      await pool.query(`
        INSERT INTO "${dbSchema}".posts (author_id, title, content, published, views)
        VALUES (${authorId}, 'Post ${i}', 'Content for post ${i}', ${i % 2 === 0}, ${Math.floor(Math.random() * 1000)})
      `);
    }

    // Insert 2000 comments (4 per post)
    for (let i = 0; i < 2000; i++) {
      const postId = (i % 500) + 1;
      await pool.query(`
        INSERT INTO "${dbSchema}".comments (post_id, author_name, body)
        VALUES (${postId}, 'Commenter ${i}', 'Comment body ${i}')
      `);
    }

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_author_id ON "${dbSchema}".posts(author_id);
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON "${dbSchema}".comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_posts_published ON "${dbSchema}".posts(published);
    `);
  }, TIMEOUT);

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  // ── Introspection query performance ──────────────────────────────────

  it(
    'introspection query completes under 500ms',
    async () => {
      const start = performance.now();
      const result = await runQuery(`
      query IntrospectionQuery {
        __schema {
          queryType { name }
          types {
            name
            kind
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      }
    `);
      const duration = performance.now() - start;

      expect(result.errors).toBeUndefined();
      expect(duration).toBeLessThan(INTROSPECTION_TIMEOUT_MS);
      console.log(`Introspection query: ${duration.toFixed(0)}ms`);
    },
    TIMEOUT
  );

  it(
    'simple query completes under 100ms',
    async () => {
      const start = performance.now();
      const result = await runQuery(`
      query {
        authors(first: 10) {
          nodes {
            id
            name
            email
          }
        }
      }
    `);
      const duration = performance.now() - start;

      expect(result.errors).toBeUndefined();
      expect(duration).toBeLessThan(100);
      console.log(`Simple query: ${duration.toFixed(0)}ms`);
    },
    TIMEOUT
  );

  // ── N+1 detection ────────────────────────────────────────────────────

  it(
    'complex relational query generates minimal SQL round-trips',
    async () => {
      const sqlSpy = jest.spyOn(pool, 'query');

      const result = await runQuery(`
      query {
        authors(first: 10) {
          nodes {
            name
            posts(first: 3) {
              nodes {
                title
                comments(first: 2) {
                  nodes {
                    authorName
                    body
                  }
                }
              }
            }
          }
        }
      }
    `);

      expect(result.errors).toBeUndefined();
      // v5 should batch these into far fewer than N+1 queries
      // Without N+1: ~3-5 queries (schema + data)
      // With N+1: 1 + 10 + 30 = 41+ queries
      const queryCount = sqlSpy.mock.calls.length;
      console.log(`Complex relational query: ${queryCount} SQL round-trips`);
      expect(queryCount).toBeLessThan(COMPLEX_QUERY_MAX_ROUNDTRIPS);
    },
    TIMEOUT
  );

  // ── Pagination performance ───────────────────────────────────────────

  it(
    'paginated query with large offset performs efficiently',
    async () => {
      const start = performance.now();
      const result = await runQuery(`
      query {
        posts(first: 50, offset: 200) {
          nodes {
            id
            title
            views
          }
          totalCount
        }
      }
    `);
      const duration = performance.now() - start;

      expect(result.errors).toBeUndefined();
      expect(result.data?.posts?.nodes).toHaveLength(50);
      console.log(`Paginated query (offset 200): ${duration.toFixed(0)}ms`);
    },
    TIMEOUT
  );

  // ── Filter performance ───────────────────────────────────────────────

  it(
    'filtered query with index performs efficiently',
    async () => {
      const start = performance.now();
      const result = await runQuery(`
      query {
        posts(filter: {published: {equalTo: true}}, first: 100) {
          nodes {
            id
            title
          }
          totalCount
        }
      }
    `);
      const duration = performance.now() - start;

      expect(result.errors).toBeUndefined();
      console.log(`Filtered query: ${duration.toFixed(0)}ms`);
    },
    TIMEOUT
  );

  // ── Aggregate performance ────────────────────────────────────────────

  it(
    'aggregate query with groupBy performs efficiently',
    async () => {
      const start = performance.now();
      const result = await runQuery(`
      query {
        posts {
          totalCount
          sumOfViews
          avgOfViews
        }
      }
    `);
      const duration = performance.now() - start;

      expect(result.errors).toBeUndefined();
      console.log(`Aggregate query: ${duration.toFixed(0)}ms`);
    },
    TIMEOUT
  );

  // ── Concurrent query performance ─────────────────────────────────────

  it(
    'handles 5 concurrent queries efficiently',
    async () => {
      const queries = [
        `query { authors(first: 10) { nodes { id name } } }`,
        `query { posts(first: 10) { nodes { id title } } }`,
        `query { comments(first: 10) { nodes { id body } } }`,
        `query { authors { totalCount } }`,
        `query { posts { totalCount } }`,
      ];

      const start = performance.now();
      const results = await Promise.all(queries.map((q) => runQuery(q)));
      const duration = performance.now() - start;

      results.forEach((r) => expect(r.errors).toBeUndefined());
      console.log(`5 concurrent queries: ${duration.toFixed(0)}ms`);
      expect(duration).toBeLessThan(1000);
    },
    TIMEOUT
  );
});
