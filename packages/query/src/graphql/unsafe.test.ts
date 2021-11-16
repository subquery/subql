import {ApolloServer, gql} from 'apollo-server-express';
import {Pool} from 'pg';
import {getPostGraphileBuilder} from 'postgraphile-core';
import {Config} from '../configure';
import {plugins} from './plugins';
import depthLimit from 'graphql-depth-limit';

describe('unsafe', () => {
  const dbSchema = 'subquery_1';

  const config = new Config({unsafe: false});

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

  async function insertMetadata(key: string, value: string) {
    await pool.query(`INSERT INTO subquery_1._metadata(
            key, value, "createdAt", "updatedAt")
            VALUES ('${key}', '${value}', '2021-11-07 07:02:31.768+00', '2021-11-07 07:02:31.768+00');`);
  }

  async function createApolloServer() {
    const builder = await getPostGraphileBuilder(pool, [dbSchema], {
      replaceAllPlugins: plugins,
      subscriptions: true,
      dynamicJson: true,
    });

    const schema = builder.buildSchema();
    console.log(schema);

    return new ApolloServer({
      schema,
      context: {
        pgClient: pool,
      },
      // XXX: this must stay in sync with validation rules, surely there's a better way to init this?
      validationRules: config.get('unsafe') ? [] : [depthLimit(10)],
    });
  }

  beforeEach(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${dbSchema}`);
    await pool.query(`CREATE TABLE IF NOT EXISTS subquery_1._metadata (
            key character varying(255) COLLATE pg_catalog."default" NOT NULL,
            value jsonb,
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT _metadata_pkey PRIMARY KEY (key)
        )`);
  });

  afterEach(async () => {
    await pool.query(`DROP TABLE subquery_1._metadata`);
  });

  afterAll((done) => {
    pool.end();
    done();
  });

  it('vampires', async () => {
    for (let i = 0; i < 1000; i++) {
      await insertMetadata(i.toString(), i.toString());
    }

    const GET_BIG_BOY = gql`
      query {
        _metadata {
          nodes {
            key,
          }
        }
      }
    `;

    const server = await createApolloServer();

    const results = await server.executeOperation({query: GET_BIG_BOY});
    //const fetchedMeta = results.data._metadata;
    console.log(results);
  });
});
