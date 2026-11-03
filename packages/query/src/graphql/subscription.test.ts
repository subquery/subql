// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {AddressInfo} from 'net';
import {setTimeout as delay} from 'timers/promises';
import {INestApplication} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {hashName} from '@subql/utils';
import {Client, createClient} from 'graphql-ws';
import {Pool, PoolClient} from 'pg';
import WebSocket from 'ws';
import {AppModule} from '../app.module';
import {Config} from '../configure';

const dbSchema = 'subquery_subscription';

jest.mock('../yargs', () => {
  const actualModule = jest.requireActual('../yargs');
  const args: Record<string, unknown> = {
    name: 'subquery_subscription',
    'disable-hot-schema': true,
    'query-alias-limit': 1,
    subscription: true,
  };
  return {
    ...actualModule,
    getYargsOption: jest.fn(() => ({argv: args})),
    argv: (arg: string) => args[arg],
  };
});

// Boots the whole service, because subscriptions run on the HTTP server that Nest creates
describe('subscriptions', () => {
  const config = new Config({});
  const pool = new Pool({
    user: config.get('DB_USER'),
    password: config.get('DB_PASS'),
    host: config.get('DB_HOST'),
    port: config.get('DB_PORT'),
    database: config.get('DB_DATABASE'),
  });

  let app: INestApplication;
  let client: Client;
  let httpUrl: string;
  const serviceClients = new Set<PoolClient>();

  function subscribe(query: string): unknown[] {
    const events: unknown[] = [];
    client.subscribe(
      {query},
      {
        next: ({data}) => events.push(data),
        error: (error) => events.push({error}),
        complete: () => undefined,
      }
    );
    return events;
  }

  // The same message the indexer's trigger sends when a row changes
  async function notify(id: string, mutationType: string): Promise<void> {
    const {
      rows: [{_id}],
    } = await pool.query(`SELECT _id FROM "${dbSchema}".items WHERE id = $1`, [id]);
    const payload = {id, mutation_type: mutationType, _entity: {id, _id}, _block_height: 1};
    const channel = hashName(dbSchema, 'notify_channel', 'items');
    await pool.query('SELECT pg_notify($1, $2)', [channel, JSON.stringify(payload)]);
  }

  // There is no signal for when a subscription starts listening, so keep sending until one arrives
  async function notifyUntilReceived(events: unknown[], ...messages: [string, string][]): Promise<void> {
    for (let i = 0; i < 40 && !events.length; i++) {
      for (const [id, mutationType] of messages) {
        await notify(id, mutationType);
      }
      await delay(100);
    }
  }

  // Building the schema can take longer than Jest's default when the tests run in parallel
  beforeAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.query(`CREATE SCHEMA "${dbSchema}"`);
    await pool.query(`CREATE TABLE "${dbSchema}".items (
      id text NOT NULL,
      name text,
      _id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      _block_range int8range NOT NULL
    )`);
    await pool.query(`INSERT INTO "${dbSchema}".items (id, name, _block_range) VALUES
      ('a', 'first', '[1,)'),
      ('b', 'second', '[1,)')`);

    app = await NestFactory.create(AppModule, {logger: false});
    app.get(Pool).on('acquire', (poolClient) => serviceClients.add(poolClient));
    await app.listen(0, '127.0.0.1');
    const {port} = app.getHttpServer().address() as AddressInfo;
    httpUrl = `http://127.0.0.1:${port}/`;
    client = createClient({url: `ws://127.0.0.1:${port}/`, webSocketImpl: WebSocket, retryAttempts: 0});
  }, 60000);

  afterAll(async () => {
    await client?.dispose();
    await app?.close();
    // Nest doesn't close the pool from ConfigureModule, and it would keep the test process alive.
    // pg-pubsub never returns the client it listens on, so return it once the pool is ending, which stops it reconnecting.
    const ended = app?.get(Pool).end();
    [...serviceClients]
      .filter((poolClient) => poolClient.listenerCount('notification') > 0)
      .forEach((c) => c.release());
    await ended;
    await pool.query(`DROP SCHEMA IF EXISTS "${dbSchema}" CASCADE`);
    await pool.end();
  });

  it('delivers changed rows over the socket', async () => {
    const events = subscribe('subscription{items{id mutation_type _entity{id name}}}');
    await notifyUntilReceived(events, ['a', 'UPDATE']);
    expect(events[0]).toEqual({items: {id: 'a', mutation_type: 'UPDATE', _entity: {id: 'a', name: 'first'}}});
  });

  it('filters events by id and mutation type', async () => {
    const otherId = subscribe('subscription{items(id:["c"]){id}}');
    const otherType = subscribe('subscription{items(mutation:[INSERT]){id}}');
    const matching = subscribe('subscription{items(id:["a"],mutation:[DELETE]){id mutation_type}}');
    await notifyUntilReceived(matching, ['b', 'DELETE'], ['a', 'UPDATE'], ['a', 'DELETE']);
    expect(new Set(matching.map((event) => JSON.stringify(event)))).toEqual(
      new Set([JSON.stringify({items: {id: 'a', mutation_type: 'DELETE'}})])
    );
    expect(otherId).toEqual([]);
    expect(otherType).toEqual([]);
  });

  it.each([
    ['a subscription', 'subscription{items{id}}'],
    ['a subscription over the alias limit', 'subscription{items{a:id b:id}}'],
  ])('rejects %s over GET', async (_, source) => {
    const res = await fetch(`${httpUrl}?query=${encodeURIComponent(source)}`, {headers: {accept: 'application/json'}});
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });
});
