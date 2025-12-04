// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {setInterval} from 'timers';
import PgPubSub from '@graphile/pg-pubsub';
import {Module, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {HttpAdapterHost} from '@nestjs/core';
import {delay} from '@subql/common';
import {hashName} from '@subql/utils';
import {getPostGraphileBuilder, Plugin, PostGraphileCoreOptions} from '@subql/x-postgraphile-core';
import {ApolloServerPluginCacheControl, ApolloServerPluginLandingPageDisabled} from 'apollo-server-core';
import {ApolloServer, UserInputError} from 'apollo-server-express';
import compression from 'compression';
import {NextFunction, Request, Response} from 'express';
import {GraphQLSchema} from 'graphql';
import {useServer} from 'graphql-ws/lib/use/ws';
import {set} from 'lodash';
import {Pool, PoolClient} from 'pg';
import pinoLogger from 'pino-http';
import {makePluginHook} from 'postgraphile';
import {WebSocketServer} from 'ws';
import {Config} from '../configure';
import {queryExplainPlugin} from '../configure/x-postgraphile/debugClient';
import {getLogger, PinoConfig} from '../utils/logger';
import {getYargsOption} from '../yargs';
import {plugins} from './plugins';
import {PgSubscriptionPlugin} from './plugins/PgSubscriptionPlugin';
import {playgroundPlugin} from './plugins/PlaygroundPlugin';
import {queryAliasLimit} from './plugins/QueryAliasLimitPlugin';
import {queryComplexityPlugin} from './plugins/QueryComplexityPlugin';
import {queryDepthLimitPlugin} from './plugins/QueryDepthLimitPlugin';
import {ProjectService} from './project.service';

const {argv} = getYargsOption();
const logger = getLogger('graphql-module');

const SCHEMA_RETRY_INTERVAL = 10; //seconds
const SCHEMA_RETRY_NUMBER = 5;
const WS_ROUTE = '/';

class NoInitError extends Error {
  constructor() {
    super('GraphqlModule has not been initialized');
  }
}
@Module({
  providers: [ProjectService],
})
export class GraphqlModule implements OnModuleInit, OnModuleDestroy {
  private _apolloServer?: ApolloServer;
  private wsCleanup?: ReturnType<typeof useServer>;
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly config: Config,
    private readonly pgPool: Pool,
    private readonly projectService: ProjectService
  ) {}

  private get apolloServer(): ApolloServer {
    assert(this._apolloServer, new NoInitError());
    return this._apolloServer;
  }

  async onModuleInit(): Promise<void> {
    if (!this.httpAdapterHost) {
      return;
    }
    try {
      this._apolloServer = await this.createServer();
    } catch (e: any) {
      throw new Error(`create apollo server failed, ${e.message}`);
    }
  }

  async schemaListener(dbSchema: string, options: PostGraphileCoreOptions): Promise<void> {
    // In order to apply hotSchema Reload without using apollo Gateway, must access the private method, hence the need to use set()
    try {
      const schema = await this.buildSchema(dbSchema, options);
      if (schema && !!(this.apolloServer as any)?.generateSchemaDerivedData) {
        const schemaDerivedData = await (this.apolloServer as any).generateSchemaDerivedData(schema);
        set(this.apolloServer, 'schema', schema);
        set(this.apolloServer, 'state.schemaManager.schemaDerivedData', schemaDerivedData);
        logger.info('Schema updated');
      }
    } catch (e: any) {
      logger.error(e, `Failed to hot reload Schema`);
      process.exit(1);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.apolloServer?.stop(), this.wsCleanup?.dispose()]);
  }

  private async buildSchema(
    dbSchema: string,
    options: PostGraphileCoreOptions,
    retries = SCHEMA_RETRY_NUMBER
  ): Promise<GraphQLSchema> {
    if (retries > 0) {
      try {
        const builder = await getPostGraphileBuilder(this.pgPool, [dbSchema], options);

        const graphqlSchema = builder.buildSchema();
        return graphqlSchema;
      } catch (e: any) {
        await delay(SCHEMA_RETRY_INTERVAL);
        if (retries === 1) {
          logger.error(e);
        }
        return this.buildSchema(dbSchema, options, --retries);
      }
    } else {
      throw new Error(`Failed to build schema ${dbSchema} ${SCHEMA_RETRY_NUMBER} times`);
    }
  }

  private setupKeepAlive(pgClient: PoolClient) {
    const interval = argv['sl-keep-alive-interval'] || 180000;
    logger.info(`Setup PG Pool keep alive. interval ${interval} ms`);
    setInterval(() => {
      void (async () => {
        try {
          await pgClient.query('SELECT 1');
        } catch (err) {
          getLogger('db').error('Schema listener client keep-alive query failed: ', err);
        }
      })();
    }, interval);
  }

  private async createServer() {
    const app = this.httpAdapterHost.httpAdapter.getInstance();
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();

    const schemaName = this.config.get<string>('name');
    if (!schemaName) throw new Error('Unable to get schema name from config');

    const dbSchema = await this.projectService.getProjectSchema(schemaName);
    let options: PostGraphileCoreOptions = {
      replaceAllPlugins: plugins,
      subscriptions: true,
      dynamicJson: true,
      graphileBuildOptions: {
        connectionFilterRelations: false, // We use our own forked version with historical support

        // cockroach db does not support pgPartition
        pgUsePartitionedParent: true,
      },
    };

    if (argv.subscription) {
      const pluginHook = makePluginHook([PgPubSub]);
      // Must be called manually to init PgPubSub since we're using Apollo Server and not postgraphile
      options = pluginHook('postgraphile:options', options, {pgPool: this.pgPool});
      options.replaceAllPlugins ??= [];
      options.appendPlugins ??= [];
      options.replaceAllPlugins.push(PgSubscriptionPlugin as Plugin);
      while (options.appendPlugins.length) {
        const replaceAllPlugin = options.appendPlugins.pop();
        if (replaceAllPlugin) options.replaceAllPlugins.push(replaceAllPlugin);
      }
    }

    if (!argv['disable-hot-schema']) {
      try {
        const pgClient = await this.pgPool.connect();
        await pgClient.query(`LISTEN "${hashName(dbSchema, 'schema_channel', '_metadata')}"`);

        // Set up a keep-alive interval to prevent the connection from being killed
        this.setupKeepAlive(pgClient);

        pgClient.on('error', (err: Error) => {
          getLogger('db').error('PostgreSQL schema listener client error: ', err);
          process.exit(1);
        });

        pgClient.on('notification', (msg) => {
          if (msg.payload === 'schema_updated') {
            void this.schemaListener(dbSchema, options);
          }
        });
      } catch (e) {
        logger.warn('Failed to init hot-schema reload', e);
      }
    }
    const schema = await this.buildSchema(dbSchema, options);

    const apolloServerPlugins = [
      ApolloServerPluginCacheControl({
        defaultMaxAge: 5,
        calculateHttpHeaders: true,
      }),
      this.config.get('playground')
        ? playgroundPlugin({url: '/', subscriptionUrl: argv.subscription ? WS_ROUTE : undefined})
        : ApolloServerPluginLandingPageDisabled(),
      queryComplexityPlugin({schema, maxComplexity: argv['query-complexity']}),
      queryDepthLimitPlugin({schema, maxDepth: argv['query-depth-limit']}),
      queryAliasLimit({schema, limit: argv['query-alias-limit']}),
    ];

    if (argv['query-explain']) {
      apolloServerPlugins.push(queryExplainPlugin(getLogger('explain')));
    }

    const server = new ApolloServer({
      schema,
      context: {
        pgClient: this.pgPool,
      },
      plugins: apolloServerPlugins,
      debug: this.config.get('NODE_ENV') !== 'production',
    });

    if (argv.subscription) {
      const wsServer = new WebSocketServer({
        server: httpServer,
        path: WS_ROUTE,
      });

      this.wsCleanup = useServer({schema, context: {pgClient: this.pgPool}}, wsServer);
    }

    app.use(pinoLogger(PinoConfig));
    app.use(limitBatchedQueries);
    app.use(compression());

    await server.start();
    server.applyMiddleware({
      app,
      path: '/',
      cors: true,
    });
    return server;
  }
}
function limitBatchedQueries(req: Request, res: Response, next: NextFunction): void {
  const errors: UserInputError[] = [];
  if (argv['query-batch-limit'] && argv['query-batch-limit'] > 0) {
    if (req.method === 'POST') {
      try {
        const queries = req.body;
        if (Array.isArray(queries) && queries.length > argv['query-batch-limit']) {
          errors.push(new UserInputError('Batch query limit exceeded'));
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw errors;
        }
      } catch (error: any) {
        res.status(500).json({errors: [...error]});
        return next(error);
      }
    }
  }
  next();
}
