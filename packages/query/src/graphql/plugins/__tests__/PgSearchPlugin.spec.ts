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

describe('PgSearchPlugin', () => {
  const dbSchema = 'subquery_search_test';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);

    // Table with a tsvector column for full-text search
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".article (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT,
        search_vec TSVECTOR
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS article_search_vec_idx
        ON "${dbSchema}".article USING GIN (search_vec)
    `);

    // Computed column function: takes a `search` text parameter.
    // PostGraphile v5 exposes this as `search(search: String, ...)` on the
    // Article type. PgSearchPlugin intercepts fields where
    // pgFieldResource.parameters includes a 'search' param and sanitizes
    // input via pg-tsquery before passing to the original plan.
    await pool.query(`
      CREATE OR REPLACE FUNCTION "${dbSchema}".article_search(
        article "${dbSchema}".article,
        search text
      ) RETURNS SETOF "${dbSchema}".article
      LANGUAGE sql STABLE
      AS $$
        SELECT * FROM "${dbSchema}".article
        WHERE search_vec @@ to_tsquery('english', search)
      $$
    `);

    // Insert test data with tsvector values
    await pool.query(`
      INSERT INTO "${dbSchema}".article (title, body, search_vec) VALUES
        ('Hello World', 'A greeting article', to_tsvector('english', 'hello world greeting')),
        ('PostgreSQL Guide', 'Database tutorial', to_tsvector('english', 'postgresql database tutorial guide')),
        ('JavaScript Tips', 'Web development', to_tsvector('english', 'javascript web development tips'))
    `);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  /* ───────── SEARCH ARG EXISTS ───────── */

  it('exposes search argument on computed column field', async () => {
    const result = await runQuery(`
      {
        __type(name: "Article") {
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
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const fields = result.data?.__type?.fields ?? [];

    // The computed column function generates a `search` field on Article type
    const searchField = fields.find((f) => f.name === 'search');
    expect(searchField).toBeDefined();

    const searchArg = searchField.args.find((a) => a.name === 'search');
    expect(searchArg).toBeDefined();
    expect(searchArg.type?.name ?? searchArg.type?.ofType?.name).toBe('String');
  });

  /* ───────── SEARCH QUERIES ───────── */

  it('searches articles via per-row computed column', async () => {
    // PostGraphile v5 exposes set-returning computed columns as connection
    // fields on the type. The `search` field is on each Article row.
    // Fetch an article, then use its search field.
    const result = await runQuery(`
      {
        articles(first: 1) {
          nodes {
            search(search: "hello") {
              nodes {
                title
              }
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const searchNodes = result.data?.articles?.nodes?.[0]?.search?.nodes ?? [];
    // "hello" should match "Hello World" article
    const titles = searchNodes.map((n) => n.title);
    expect(titles).toContain('Hello World');
  });

  it('handles special tsquery characters without error', async () => {
    // PgSearchPlugin wraps the search arg through Tsquery parser.
    // Special chars like "&", "|", "!" should be sanitized, not cause errors.
    const result = await runQuery(`
      {
        articles(first: 1) {
          nodes {
            search(search: "hello & world") {
              nodes {
                title
              }
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    // Should not error even with special chars — pg-tsquery handles sanitization
    expect(result.data?.articles?.nodes?.[0]?.search).toBeDefined();
  });

  it('returns empty results for non-matching search term', async () => {
    const result = await runQuery(`
      {
        articles(first: 1) {
          nodes {
            search(search: "xyznonexistent") {
              nodes {
                title
              }
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const searchNodes = result.data?.articles?.nodes?.[0]?.search?.nodes ?? [];
    expect(searchNodes).toHaveLength(0);
  });
});
