// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getPostGraphileBuilder} from '@subql/x-postgraphile-core';
import {ApolloServer} from 'apollo-server-express';
import {Pool} from 'pg';
import {Config} from '../configure';
import {plugins} from './plugins';

jest.mock('../yargs', () => {
  const actualModule = jest.requireActual('../yargs');
  const args: Record<string, unknown> = {name: 'test', 'query-limit': 100};
  return {
    ...actualModule,
    getYargsOption: jest.fn(() => ({argv: args})),
    argv: (arg: string) => args[arg],
  };
});

type Page = {
  nodes: {id: string}[];
  pageInfo: {hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null};
};

const dbSchema = 'subquery_pagination';
const encodeCursor = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64');

describe('cursor pagination', () => {
  const config = new Config({});

  const pool = new Pool({
    user: config.get('DB_USER'),
    password: config.get('DB_PASS'),
    host: config.get('DB_HOST_READ') ?? config.get('DB_HOST'),
    port: config.get('DB_PORT'),
    database: config.get('DB_DATABASE'),
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL client generated error: ', err.message);
  });

  let server: ApolloServer;

  async function query<T = any>(source: string): Promise<T> {
    const result = await server.executeOperation({query: source});
    expect(result.errors).toBeUndefined();
    return result.data as T;
  }

  const pageFields = 'nodes { id } pageInfo { hasNextPage hasPreviousPage startCursor endCursor }';

  async function rowsPage(orderArgs: string, pageArgs: string): Promise<Page> {
    return query<{rows: Page}>(`{ rows(${orderArgs} ${pageArgs}) { ${pageFields} } }`).then((data) => data.rows);
  }

  async function expectedOrder(orderBy: string): Promise<string[]> {
    const {rows} = await pool.query(`SELECT id FROM "${dbSchema}".rows ORDER BY ${orderBy}`);
    return rows.map((row) => row.id);
  }

  // Walks to the end of the connection, checking pageInfo against the expected position on every page
  async function walkForward(getPage: (pageArgs: string) => Promise<Page>, expected: string[], size: number) {
    const seen: string[] = [];
    let after: string | null = null;
    for (let i = 0; i <= expected.length; i++) {
      const page: Page = await getPage(`first: ${size}${after ? `, after: "${after}"` : ''}`);
      const start = seen.length;
      seen.push(...page.nodes.map((node) => node.id));
      expect(page.pageInfo.hasPreviousPage).toBe(start > 0);
      expect(page.pageInfo.hasNextPage).toBe(seen.length < expected.length);
      if (!page.pageInfo.hasNextPage) break;
      after = page.pageInfo.endCursor;
    }
    expect(seen).toEqual(expected);
  }

  async function walkBackward(getPage: (pageArgs: string) => Promise<Page>, expected: string[], size: number) {
    const seen: string[] = [];
    let before: string | null = null;
    for (let i = 0; i <= expected.length; i++) {
      const page: Page = await getPage(`last: ${size}${before ? `, before: "${before}"` : ''}`);
      const remaining = expected.length - seen.length;
      seen.unshift(...page.nodes.map((node) => node.id));
      expect(page.pageInfo.hasNextPage).toBe(remaining < expected.length);
      expect(page.pageInfo.hasPreviousPage).toBe(seen.length < expected.length);
      if (!page.pageInfo.hasPreviousPage) break;
      before = page.pageInfo.startCursor;
    }
    expect(seen).toEqual(expected);
  }

  beforeAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.query(`CREATE SCHEMA "${dbSchema}"`);
    await pool.query(`CREATE TABLE "${dbSchema}".parents (id text PRIMARY KEY)`);
    await pool.query(`CREATE TABLE "${dbSchema}".rows (
      id text PRIMARY KEY,
      score int NULL,
      bucket int NULL,
      required int NOT NULL,
      parent_id text NOT NULL CONSTRAINT rows_parent_fk REFERENCES "${dbSchema}".parents (id)
    )`);
    await pool.query(`COMMENT ON CONSTRAINT rows_parent_fk ON "${dbSchema}".rows IS '@foreignFieldName rows'`);
    await pool.query(`CREATE TABLE "${dbSchema}".versions (
      id text NOT NULL,
      score int NULL,
      "_id" uuid PRIMARY KEY,
      "_block_range" int8range NOT NULL
    )`);
    // Each entity has an old version that ends at block 10, which must not show up at later heights
    await pool.query(`INSERT INTO "${dbSchema}".versions (id, score, "_id", "_block_range")
      SELECT id, score, ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, range::int8range
      FROM (VALUES
        ('a', 1, 1, '[10,)'), ('b', NULL, 2, '[10,)'), ('c', 2, 3, '[10,)'), ('d', NULL, 4, '[10,)'), ('e', 3, 5, '[10,)'),
        ('a', 99, 6, '[0,10)'), ('b', 98, 7, '[0,10)')
      ) AS v(id, score, n, range)`);
    await pool.query(`CREATE FUNCTION "${dbSchema}".search_versions(search text) RETURNS SETOF "${dbSchema}".versions
      LANGUAGE sql STABLE AS $$ SELECT * FROM "${dbSchema}".versions $$`);
    await pool.query(`CREATE TABLE "${dbSchema}".unkeyed_rows (value int NULL)`);
    await pool.query(`INSERT INTO "${dbSchema}".unkeyed_rows (value) VALUES (1), (NULL), (3), (NULL)`);
    await pool.query(`INSERT INTO "${dbSchema}".parents (id) VALUES ('p1')`);
    // Half of the rows have a NULL score, and scores and buckets repeat so ordering needs the id tie-break
    await pool.query(`INSERT INTO "${dbSchema}".rows (id, score, bucket, required, parent_id) VALUES
      ('a', 1, 1, 1, 'p1'), ('b', 1, NULL, 2, 'p1'), ('c', 2, 2, 3, 'p1'), ('d', 3, 1, 4, 'p1'),
      ('e', 4, NULL, 5, 'p1'), ('f', 5, 2, 6, 'p1'), ('g', NULL, 1, 7, 'p1'), ('h', NULL, NULL, 8, 'p1'),
      ('i', NULL, 2, 9, 'p1'), ('j', NULL, 1, 10, 'p1'), ('k', NULL, NULL, 11, 'p1'), ('l', NULL, 2, 12, 'p1')`);

    const builder = await getPostGraphileBuilder(pool, [dbSchema], {
      replaceAllPlugins: plugins,
      subscriptions: true,
      dynamicJson: true,
    });
    server = new ApolloServer({schema: builder.buildSchema(), context: {pgClient: pool}});
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  const orderings = [
    {name: 'ASC (default NULLS LAST)', args: 'orderBy: SCORE_ASC,', sql: 'score ASC NULLS LAST, id ASC'},
    {name: 'DESC (default NULLS FIRST)', args: 'orderBy: SCORE_DESC,', sql: 'score DESC NULLS FIRST, id ASC'},
    {
      name: 'ASC NULLS FIRST',
      args: 'orderBy: SCORE_ASC, orderByNull: NULLS_FIRST,',
      sql: 'score ASC NULLS FIRST, id ASC',
    },
    {name: 'ASC NULLS LAST', args: 'orderBy: SCORE_ASC, orderByNull: NULLS_LAST,', sql: 'score ASC NULLS LAST, id ASC'},
    {
      name: 'DESC NULLS FIRST',
      args: 'orderBy: SCORE_DESC, orderByNull: NULLS_FIRST,',
      sql: 'score DESC NULLS FIRST, id ASC',
    },
    {
      name: 'DESC NULLS LAST',
      args: 'orderBy: SCORE_DESC, orderByNull: NULLS_LAST,',
      sql: 'score DESC NULLS LAST, id ASC',
    },
    {
      name: 'two nullable keys',
      args: 'orderBy: [BUCKET_DESC, SCORE_ASC],',
      sql: 'bucket DESC NULLS FIRST, score ASC NULLS LAST, id ASC',
    },
    {name: 'NOT NULL column', args: 'orderBy: REQUIRED_DESC,', sql: 'required DESC, id ASC'},
    {name: 'primary key (default order)', args: '', sql: 'id ASC'},
  ];

  describe.each(orderings)('$name', ({args, sql}) => {
    it.each([1, 3, 5, 100])('walks forward over every row once, page size %i', async (size) => {
      await walkForward((pageArgs) => rowsPage(args, pageArgs), await expectedOrder(sql), size);
    });

    it.each([1, 3, 5, 100])('walks backward over every row once, page size %i', async (size) => {
      await walkBackward((pageArgs) => rowsPage(args, pageArgs), await expectedOrder(sql), size);
    });

    it('returns no row twice when one page uses both after and before', async () => {
      const expected = await expectedOrder(sql);
      const first = await rowsPage(args, 'first: 3');
      const last = await rowsPage(args, 'last: 3');
      const middle = await rowsPage(
        args,
        `after: "${first.pageInfo.endCursor}", before: "${last.pageInfo.startCursor}"`
      );
      expect(middle.nodes.map((node) => node.id)).toEqual(expected.slice(3, -3));
      expect(middle.pageInfo.hasNextPage).toBe(true);
      expect(middle.pageInfo.hasPreviousPage).toBe(true);
    });
  });

  it('paginates relation connections', async () => {
    const getPage = async (pageArgs: string) =>
      query<any>(`{ parents { nodes { rows(orderBy: SCORE_DESC, ${pageArgs}) { ${pageFields} } } } }`).then(
        (data) => data.parents.nodes[0].rows as Page
      );
    const expected = await expectedOrder('score DESC NULLS FIRST, id ASC');
    await walkForward(getPage, expected, 5);
    await walkBackward(getPage, expected, 5);
  });

  it('paginates historical tables at a block height', async () => {
    const getPage = async (pageArgs: string) =>
      query<any>(`{ versions(blockHeight: "20", orderBy: SCORE_DESC, ${pageArgs}) { ${pageFields} } }`).then(
        (data) => data.versions as Page
      );
    const expected = ['b', 'd', 'e', 'c', 'a'];
    await walkForward(getPage, expected, 2);
    await walkBackward(getPage, expected, 2);
  });

  it('paginates sortable search connections', async () => {
    const getPage = async (pageArgs: string) =>
      query<any>(
        `{ searchVersions(search: "a", blockHeight: "20", orderBy: PRIMARY_KEY_ASC, ${pageArgs}) { ${pageFields} } }`
      ).then((data) => data.searchVersions as Page);
    const expected = ['a', 'b', 'c', 'd', 'e'];
    await walkForward(getPage, expected, 2);
    await walkBackward(getPage, expected, 2);
  });

  it('keeps the cursor format, so cursors saved by clients stay valid', async () => {
    const page = await rowsPage('orderBy: SCORE_ASC,', 'first: 1');
    expect(JSON.parse(Buffer.from(page.pageInfo.endCursor as string, 'base64').toString())).toEqual([
      'score_asc',
      [1, 'a'],
    ]);

    const nullCursor = encodeCursor(['score_desc', [null, 'k']]);
    const afterNull = await rowsPage('orderBy: SCORE_DESC,', `first: 2, after: "${nullCursor}"`);
    expect(afterNull.nodes.map((node) => node.id)).toEqual(['l', 'f']);
  });

  it('returns no rows for a cursor from another order', async () => {
    const page = await rowsPage('orderBy: SCORE_DESC,', `first: 2, after: "${encodeCursor(['score_asc', [1, 'a']])}"`);
    expect(page.nodes).toEqual([]);
  });

  it('matches nothing for order keys missing from a cursor', async () => {
    const page = await rowsPage('orderBy: SCORE_ASC,', `first: 2, after: "${encodeCursor(['score_asc', [1]])}"`);
    expect(page.nodes.map((node) => node.id)).toEqual(['c', 'd']);
  });

  it('pages by row position without an order', async () => {
    const first = await query<any>(`{ unkeyedRows(first: 3) { nodes { value } pageInfo { endCursor hasNextPage } } }`);
    expect(first.unkeyedRows.nodes).toHaveLength(3);
    expect(first.unkeyedRows.pageInfo.hasNextPage).toBe(true);
    expect(JSON.parse(Buffer.from(first.unkeyedRows.pageInfo.endCursor, 'base64').toString())).toEqual(['natural', 3]);

    const rest = await query<any>(
      `{ unkeyedRows(first: 3, after: "${first.unkeyedRows.pageInfo.endCursor}") { nodes { value } } }`
    );
    expect(rest.unkeyedRows.nodes).toHaveLength(1);
  });

  it('rejects a cursor on an order that is not unique', async () => {
    const result = await server.executeOperation({
      query: `{ unkeyedRows(orderBy: VALUE_ASC, first: 1, after: "${encodeCursor(['value_asc', [1]])}") { nodes { value } } }`,
    });
    expect(result.errors?.[0].message).toContain('The order supplied is not unique');
  });

  it('rejects a cursor that is not valid JSON', async () => {
    const result = await server.executeOperation({query: `{ rows(first: 1, after: "not-a-cursor") { nodes { id } } }`});
    expect(result.errors?.[0].message).toContain('Invalid cursor');
  });

  describe('generated SQL', () => {
    let sqlSpy: jest.SpyInstance;

    beforeEach(() => {
      sqlSpy = jest.spyOn(pool, 'query');
    });

    afterEach(() => {
      sqlSpy.mockRestore();
    });

    const executedSql = () => sqlSpy.mock.calls.map(([text]) => String(text)).join('\n');

    it('keeps an indexable comparison for NOT NULL columns', async () => {
      await rowsPage('', `first: 2, after: "${encodeCursor(['primary_key_asc', ['b']])}"`);
      expect(executedSql()).toMatch(/"id" > \$\d/);
      expect(executedSql()).not.toMatch(/"id" IS (NOT )?NULL/);
    });

    it('includes NULL rows after a non-NULL cursor on a nullable column', async () => {
      await rowsPage('orderBy: SCORE_ASC,', `first: 2, after: "${encodeCursor(['score_asc', [1, 'a']])}"`);
      expect(executedSql()).toMatch(/"score" IS NULL/);
    });
  });
});
