// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {AddressInfo} from 'net';
import {INestApplication} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {Pool} from 'pg';
import {AppModule} from '../app.module';
import {Config} from '../configure';

const dbSchema = 'subquery_http';

jest.mock('../yargs', () => {
  const actualModule = jest.requireActual('../yargs');
  const args: Record<string, unknown> = {
    name: 'subquery_http',
    'disable-hot-schema': true,
    'query-alias-limit': 1,
    'query-batch-limit': 2,
    'query-depth-limit': 5,
    'query-limit': 100,
  };
  return {
    ...actualModule,
    getYargsOption: jest.fn(() => ({argv: args})),
    argv: (arg: string) => args[arg],
  };
});

// Boots the whole service, because these behaviours depend on how Nest, Express and Apollo fit together
describe('HTTP interface', () => {
  const config = new Config({});
  const pool = new Pool({
    user: config.get('DB_USER'),
    password: config.get('DB_PASS'),
    host: config.get('DB_HOST'),
    port: config.get('DB_PORT'),
    database: config.get('DB_DATABASE'),
  });

  let app: INestApplication;
  let url: string;

  const query = '{items(first:1){nodes{id}}}';
  const expected = {data: {items: {nodes: [{id: 'a'}]}}};

  async function post(body: unknown, contentType = 'application/json') {
    return fetch(url, {
      method: 'POST',
      headers: {'content-type': contentType},
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  // Building the schema can take longer than Jest's default when the tests run in parallel
  beforeAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.query(`CREATE SCHEMA "${dbSchema}"`);
    await pool.query(`CREATE TABLE "${dbSchema}".items (id text PRIMARY KEY)`);
    await pool.query(`INSERT INTO "${dbSchema}".items (id) VALUES ('a'), ('b')`);

    app = await NestFactory.create(AppModule, {logger: false});
    await app.listen(0, '127.0.0.1');
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/`;
  }, 60000);

  afterAll(async () => {
    await app?.close();
    // Nest doesn't close the pool from ConfigureModule, and it would keep the test process alive
    await app?.get(Pool).end();
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  it('serves queries over POST', async () => {
    const res = await post({query});
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('max-age=5, public');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(await res.json()).toEqual(expected);
  });

  it('serves queries from a form body', async () => {
    const res = await post(`query=${encodeURIComponent(query)}`, 'application/x-www-form-urlencoded');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(expected);
  });

  it('serves queries over GET', async () => {
    const res = await fetch(`${url}?query=${encodeURIComponent(query)}`, {headers: {accept: 'application/json'}});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(expected);
  });

  it('reads nested GET params with the extended query parser', async () => {
    const source = 'query($n:Int){items(first:$n){nodes{id}}}';
    const res = await fetch(`${url}?query=${encodeURIComponent(source)}&variables[n]=1`, {
      headers: {accept: 'application/json'},
    });
    const {errors} = await res.json();
    // qs turns this into {n: '1'}, which the Int variable then rejects. The simple parser would drop it instead.
    expect(errors[0].message).toContain('Int cannot represent non-integer value');
  });

  it.each([
    ['a mutation', 'mutation{x}'],
    ['a subscription', 'subscription{x}'],
    ['a mutation over the alias limit', 'mutation{a:x b:x}'],
    ['a mutation over the depth limit', 'mutation{a{b{c{d{e{f{g}}}}}}}'],
  ])('rejects %s over GET', async (_, source) => {
    const res = await fetch(`${url}?query=${encodeURIComponent(source)}`, {headers: {accept: 'application/json'}});
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect((await res.json()).errors[0].message).toBe('GET supports only query operation');
  });

  it('rejects mutations over POST', async () => {
    const res = await post({query: 'mutation{x}'});
    expect(res.status).toBe(400);
    expect((await res.json()).data).toBeUndefined();
  });

  it('serves batched queries', async () => {
    const res = await post([{query}, {query}]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([expected, expected]);
  });

  it('rejects batches over the limit', async () => {
    const res = await post([{query}, {query}, {query}]);
    expect(res.status).toBe(500);
    expect(await res.text()).toContain('Batch query limit exceeded');
  });

  it.each([
    ['plain text', 'text/plain', query],
    ['an empty JSON body', 'application/json', ''],
  ])('reports a missing query for %s', async (_, contentType, body) => {
    const res = await post(body, contentType);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('POST body missing');
  });

  it('rejects invalid JSON', async () => {
    const res = await post('{"query":');
    expect(res.status).toBe(400);
    expect((await res.json()).statusCode).toBe(400);
  });

  it('serves the health check', async () => {
    const res = await fetch(`${url}.well-known/apollo/server-health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({status: 'pass'});
  });

  it('answers CORS preflight requests', async () => {
    const res = await fetch(url, {
      method: 'OPTIONS',
      headers: {origin: 'https://example.com', 'access-control-request-method': 'POST'},
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
