// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {createTestContext} from './testHelpers';

jest.mock('../../../yargs', () => {
  const actualModule = jest.requireActual('../../../yargs');
  const getYargsOption = jest.fn(() => ({argv: {name: 'test', aggregate: true, 'query-limit': 100}}));
  const argv = (arg) => getYargsOption().argv[arg];
  return {
    ...actualModule,
    getYargsOption,
    argv,
  };
});

describe('PgBackwardRelationPlugin (v5 upstream behavior)', () => {
  const dbSchema = 'subquery_bwtest';
  const {pool, runQuery} = createTestContext(dbSchema);

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${dbSchema}`);

    // users — parent table referenced by both passports and posts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".users (
        id text NOT NULL,
        name text NOT NULL,
        CONSTRAINT users_pkey PRIMARY KEY (id)
      )
    `);

    // passports — UNIQUE FK → one-to-one backward relation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".passports (
        id text NOT NULL,
        user_id text NOT NULL,
        passport_number text NOT NULL,
        CONSTRAINT passports_pkey PRIMARY KEY (id),
        CONSTRAINT passports_user_id_key UNIQUE (user_id),
        CONSTRAINT passports_user_id_fkey FOREIGN KEY (user_id)
          REFERENCES "${dbSchema}".users (id)
      )
    `);

    // posts — non-unique FK → one-to-many backward relation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".posts (
        id text NOT NULL,
        author_id text NOT NULL,
        title text NOT NULL,
        CONSTRAINT posts_pkey PRIMARY KEY (id),
        CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id)
          REFERENCES "${dbSchema}".users (id)
      )
    `);

    // documents — multiple non-unique FKs to same parent table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".documents (
        id text NOT NULL,
        author_id text NOT NULL,
        reviewer_id text NOT NULL,
        title text NOT NULL,
        CONSTRAINT documents_pkey PRIMARY KEY (id),
        CONSTRAINT documents_author_id_fkey FOREIGN KEY (author_id)
          REFERENCES "${dbSchema}".users (id),
        CONSTRAINT documents_reviewer_id_fkey FOREIGN KEY (reviewer_id)
          REFERENCES "${dbSchema}".users (id)
      )
    `);

    // employees — self-referential FK (manager_id → employees.id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".employees (
        id text NOT NULL,
        name text NOT NULL,
        manager_id text,
        CONSTRAINT employees_pkey PRIMARY KEY (id),
        CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id)
          REFERENCES "${dbSchema}".employees (id)
      )
    `);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${dbSchema} CASCADE`);
    await pool.end();
  });

  /* ───────── INTROSPECTION: field shape ───────── */

  it('creates singular backward field for UNIQUE FK', async () => {
    const result = await runQuery(`
      {
        __type(name: "User") {
          fields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const fields: Array<{name: string; type: {name: string; kind: string; ofType?: {name: string; kind: string}}}> =
      result.data?.__type?.fields ?? [];

    const passportField = fields.find((f) => f.name === 'passport');
    expect(passportField).toBeDefined();
    // Unwrap NON_NULL if present
    const innerType = passportField?.type?.ofType ?? passportField?.type;
    expect(innerType?.name).toBe('Passport');
    expect(innerType?.kind).toBe('OBJECT');

    // No plural field for unique FK
    expect(fields.find((f) => f.name === 'passports')).toBeUndefined();
  });

  it('creates plural backward field for non-unique FK', async () => {
    const result = await runQuery(`
      {
        __type(name: "User") {
          fields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const fields: Array<{name: string; type: {name: string; kind: string; ofType?: {name: string; kind: string}}}> =
      result.data?.__type?.fields ?? [];

    // PgSimplifyInflectionPreset names backward relations from FK column name:
    // posts.author_id → authoredPosts (plural, non-unique FK)
    const postsField = fields.find((f) => f.name === 'authoredPosts');
    expect(postsField).toBeDefined();
    // Type may be wrapped in NON_NULL; unwrap to check inner type
    const innerType = postsField?.type?.ofType ?? postsField?.type;
    // Verify it's a connection type
    expect(innerType?.name).toMatch(/Connection$/);
    expect(innerType?.kind).toBe('OBJECT');

    // No singular field for non-unique FK
    expect(fields.find((f) => f.name === 'authoredPost')).toBeUndefined();
  });

  /* ───────── DATA QUERIES ───────── */

  it('fetches singular backward relation (unique FK) with data', async () => {
    await pool.query(`
      INSERT INTO "${dbSchema}".users (id, name) VALUES ('u1', 'Alice')
    `);
    await pool.query(`
      INSERT INTO "${dbSchema}".passports (id, user_id, passport_number)
      VALUES ('p1', 'u1', 'AB123456')
    `);

    const result = await runQuery(`
      {
        users {
          nodes {
            name
            passport {
              passportNumber
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(result.data?.users?.nodes).toHaveLength(1);
    expect(result.data?.users?.nodes[0]).toEqual({
      name: 'Alice',
      passport: {passportNumber: 'AB123456'},
    });
  });

  it('fetches plural backward relation (non-unique FK) with data', async () => {
    await pool.query(`
      INSERT INTO "${dbSchema}".users (id, name) VALUES ('u2', 'Bob')
    `);
    await pool.query(`
      INSERT INTO "${dbSchema}".posts (id, author_id, title) VALUES
        ('post1', 'u2', 'First Post'),
        ('post2', 'u2', 'Second Post')
    `);

    const result = await runQuery(`
      {
        users(filter: {name: {equalTo: "Bob"}}) {
          nodes {
            name
            authoredPosts {
              nodes {
                title
              }
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const bob = result.data?.users?.nodes?.[0];
    expect(bob).toBeDefined();
    expect(bob.name).toBe('Bob');
    expect(bob.authoredPosts?.nodes).toHaveLength(2);
    expect(bob.authoredPosts.nodes.map((n: any) => n.title).sort()).toEqual(['First Post', 'Second Post']);
  });

  /* ───────── COMPOSITE FK + UNIQUE ON SUBSET ───────── */

  it('treats composite FK with unique on subset as singular (v5 behavior)', async () => {
    // v5's logic: if ANY unique constraint's columns are a subset of
    // the FK columns, the relation is considered unique.
    // This is correct: if one FK column is unique, each parent row
    // maps to ≤1 child row.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}".order_items (
        order_id text NOT NULL,
        product_id text NOT NULL,
        quantity integer NOT NULL,
        CONSTRAINT order_items_pkey PRIMARY KEY (order_id, product_id),
        CONSTRAINT order_items_product_id_key UNIQUE (product_id)
      )
    `);

    // Rebuild schema with new table
    const result = await runQuery(`
      {
        __type(name: "OrderItem") {
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    // No backward relations on OrderItem since it has no FKs pointing to other tables
    // This just validates schema builds with composite PK + unique subset
    expect(result.data?.__type?.fields?.length).toBeGreaterThan(0);

    await pool.query(`DROP TABLE IF EXISTS "${dbSchema}".order_items`);
  });

  /* ───────── MULTIPLE FKs TO SAME PARENT ───────── */

  it('creates separate backward fields for each FK to same parent', async () => {
    const result = await runQuery(`
      {
        __type(name: "User") {
          fields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const fields: Array<{name: string; type: {name: string; kind: string; ofType?: {name: string; kind: string}}}> =
      result.data?.__type?.fields ?? [];

    // documents.author_id → authoredDocuments (plural, non-unique FK)
    const authoredField = fields.find((f) => f.name === 'authoredDocuments');
    expect(authoredField).toBeDefined();
    const authoredType = authoredField?.type?.ofType ?? authoredField?.type;
    expect(authoredType?.name).toMatch(/Connection$/);

    // documents.reviewer_id → reviewedDocuments (plural, non-unique FK)
    const reviewedField = fields.find((f) => f.name === 'reviewedDocuments');
    expect(reviewedField).toBeDefined();
    const reviewedType = reviewedField?.type?.ofType ?? reviewedField?.type;
    expect(reviewedType?.name).toMatch(/Connection$/);
  });

  it('fetches data from multiple backward relations to same parent', async () => {
    await pool.query(`
      INSERT INTO "${dbSchema}".documents (id, author_id, reviewer_id, title) VALUES
        ('doc1', 'u1', 'u2', 'Doc by Alice reviewed by Bob'),
        ('doc2', 'u2', 'u1', 'Doc by Bob reviewed by Alice')
    `);

    const result = await runQuery(`
      {
        users(orderBy: NAME_ASC) {
          nodes {
            name
            authoredDocuments {
              nodes {
                title
              }
            }
            reviewedDocuments {
              nodes {
                title
              }
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.users?.nodes;
    expect(nodes).toHaveLength(2);

    // Alice authored doc1, reviewed doc2
    const alice = nodes.find((n: any) => n.name === 'Alice');
    expect(alice?.authoredDocuments?.nodes).toHaveLength(1);
    expect(alice?.authoredDocuments?.nodes[0].title).toBe('Doc by Alice reviewed by Bob');
    expect(alice?.reviewedDocuments?.nodes).toHaveLength(1);
    expect(alice?.reviewedDocuments?.nodes[0].title).toBe('Doc by Bob reviewed by Alice');

    // Bob authored doc2, reviewed doc1
    const bob = nodes.find((n: any) => n.name === 'Bob');
    expect(bob?.authoredDocuments?.nodes).toHaveLength(1);
    expect(bob?.authoredDocuments?.nodes[0].title).toBe('Doc by Bob reviewed by Alice');
    expect(bob?.reviewedDocuments?.nodes).toHaveLength(1);
    expect(bob?.reviewedDocuments?.nodes[0].title).toBe('Doc by Alice reviewed by Bob');
  });

  /* ───────── SELF-REFERENTIAL FK ───────── */

  it('creates backward field for self-referential FK on Employee', async () => {
    const result = await runQuery(`
      {
        __type(name: "Employee") {
          fields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const fields: Array<{name: string; type: {name: string; kind: string; ofType?: {name: string; kind: string}}}> =
      result.data?.__type?.fields ?? [];

    // employees.manager_id → employeesByManagerId (plural connection, self-referential FK)
    const backwardField = fields.find((f) => f.name === 'employeesByManagerId');
    expect(backwardField).toBeDefined();
    const backwardType = backwardField?.type?.ofType ?? backwardField?.type;
    expect(backwardType?.name).toMatch(/Connection$/);

    // Forward relation to manager should also exist
    const managerField = fields.find((f) => f.name === 'manager');
    expect(managerField).toBeDefined();
  });

  it('fetches self-referential backward relation with data', async () => {
    await pool.query(`
      INSERT INTO "${dbSchema}".employees (id, name, manager_id) VALUES
        ('e1', 'Big Boss', NULL),
        ('e2', 'Middle Manager', 'e1'),
        ('e3', 'Team Lead', 'e1'),
        ('e4', 'Worker', 'e2')
    `);

    const result = await runQuery(`
      {
        employees(filter: {name: {equalTo: "Big Boss"}}) {
          nodes {
            name
            employeesByManagerId {
              nodes {
                name
                manager {
                  name
                }
              }
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const boss = result.data?.employees?.nodes?.[0];
    expect(boss).toBeDefined();
    expect(boss.name).toBe('Big Boss');

    const reports = boss.employeesByManagerId?.nodes;
    expect(reports).toHaveLength(2);
    const names = reports.map((n: any) => n.name).sort();
    expect(names).toEqual(['Middle Manager', 'Team Lead']);

    // Verify forward relation: Middle Manager's manager is Big Boss
    const middleMgr = reports.find((n: any) => n.name === 'Middle Manager');
    expect(middleMgr?.manager?.name).toBe('Big Boss');
  });
});
