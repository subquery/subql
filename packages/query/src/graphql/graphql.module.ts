import {Module, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {HttpAdapterHost} from '@nestjs/core';
import {ApolloServer} from 'apollo-server-express';
import {Pool} from 'pg';
import {getPostGraphileBuilder} from 'postgraphile-core';
import {Config} from '../configure';
import {plugins} from './plugins';

@Module({})
export class GraphqlModule implements OnModuleInit, OnModuleDestroy {
  private apolloServer: ApolloServer;

  constructor(private readonly httpAdapterHost: HttpAdapterHost, private readonly config: Config) {}

  async onModuleInit(): Promise<void> {
    if (!this.httpAdapterHost) {
      return;
    }
    const app = this.httpAdapterHost.httpAdapter.getInstance();

    const pgPool = new Pool({
      user: this.config.get('DB_USERNAME'),
      password: this.config.get('DB_PASSWORD'),
      host: this.config.get('DB_HOST'),
      port: this.config.get('DB_PORT'),
      database: this.config.get('DB_DATABASE'),
    });
    pgPool.on('error', (err) => {
      // tslint:disable-next-line no-console
      console.error('PostgreSQL client generated error: ', err.message);
    });
    const builder = await getPostGraphileBuilder(pgPool, [this.config.get('dbSchema')], {
      replaceAllPlugins: plugins,
    });
    const schema = builder.buildSchema();
    this.apolloServer = new ApolloServer({
      schema,
      context: {
        pgClient: pgPool,
      },
      cacheControl: {
        defaultMaxAge: 5,
      },
    });
    this.apolloServer.applyMiddleware({app, path: '/', cors: true});
  }

  async onModuleDestroy(): Promise<void> {
    return this.apolloServer?.stop();
  }
}
