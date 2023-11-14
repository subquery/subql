// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import PgPubSub from '@graphile/pg-pubsub';
import {Module, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {HttpAdapterHost} from '@nestjs/core';
import {delay, getDbType, SUPPORT_DB} from '@subql/common';
import {hashName} from '@subql/utils';
import {getPostGraphileBuilder, PostGraphileCoreOptions} from '@subql/x-postgraphile-core';
import {
  ApolloServerPluginCacheControl,
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginLandingPageGraphQLPlayground,
} from 'apollo-server-core';
import {ApolloServer} from 'apollo-server-express';
import ExpressPinoLogger from 'express-pino-logger';
import {execute, GraphQLSchema, subscribe} from 'graphql';
import {set} from 'lodash';
import {Pool} from 'pg';
import {makePluginHook} from 'postgraphile';
import {SubscriptionServer} from 'subscriptions-transport-ws';
import {Config} from '../configure';
import {queryExplainPlugin} from '../configure/x-postgraphile/debugClient';
import {getLogger, PinoConfig} from '../utils/logger';
import {getYargsOption} from '../yargs';
import {plugins} from './plugins';
import {PgSubscriptionPlugin} from './plugins/PgSubscriptionPlugin';
import {queryComplexityPlugin} from './plugins/QueryComplexityPlugin';
import {queryDepthLimitPlugin} from './plugins/QueryDepthLimitPlugin';
import {ProjectService} from './project.service';

const {argv} = getYargsOption();
const logger = getLogger('graphql-module');

const SCHEMA_RETRY_INTERVAL = 10; //seconds
const SCHEMA_RETRY_NUMBER = 5;
@Module({
  providers: [ProjectService],
})
export class GraphqlModule implements OnModuleInit, OnModuleDestroy {
  private apolloServer: ApolloServer;
  private dbType: SUPPORT_DB;
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly config: Config,
    private readonly pgPool: Pool,
    private readonly projectService: ProjectService
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.httpAdapterHost) {
      return;
    }
    this.dbType = await getDbType(this.pgPool);
    try {
      this.apolloServer = await this.createServer();
    } catch (e) {
      throw new Error(`create apollo server failed, ${e.message}`);
    }
    if (this.dbType === SUPPORT_DB.cockRoach) {
      logger.info(`Using Cockroach database, subscription and hot-schema functions are not supported`);
      argv.subscription = false;
      argv['disable-hot-schema'] = true;
    }
  }

  async schemaListener(dbSchema: string, options: PostGraphileCoreOptions): Promise<void> {
    // In order to apply hotSchema Reload without using apollo Gateway, must access the private method, hence the need to use set()
    try {
      const schema = await this.buildSchema(dbSchema, options);
      // @ts-ignore
      if (schema && !!this.apolloServer?.generateSchemaDerivedData) {
        // @ts-ignore
        const schemaDerivedData = await this.apolloServer.generateSchemaDerivedData(schema);
        set(this.apolloServer, 'schema', schema);
        set(this.apolloServer, 'state.schemaManager.schemaDerivedData', schemaDerivedData);
        logger.info('Schema updated');
      }
    } catch (e) {
      logger.error(e, `Failed to hot reload Schema`);
      process.exit(1);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async onModuleDestroy(): Promise<void> {
    return this.apolloServer?.stop();
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
      } catch (e) {
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

  private async createServer() {
    const app = this.httpAdapterHost.httpAdapter.getInstance();
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();

    const dbSchema = await this.projectService.getProjectSchema(this.config.get('name'));
    let options: PostGraphileCoreOptions = {
      replaceAllPlugins: plugins,
      subscriptions: true,
      dynamicJson: true,
      graphileBuildOptions: {
        connectionFilterRelations: true,
        // cockroach db does not support pgPartition
        pgUsePartitionedParent: this.dbType !== SUPPORT_DB.cockRoach,
      },
    };

    if (argv.subscription) {
      const pluginHook = makePluginHook([PgPubSub]);
      // Must be called manually to init PgPubSub since we're using Apollo Server and not postgraphile
      options = pluginHook('postgraphile:options', options, {pgPool: this.pgPool});
      options.replaceAllPlugins.push(PgSubscriptionPlugin);
      while (options.appendPlugins.length) {
        options.replaceAllPlugins.push(options.appendPlugins.pop());
      }
    }

    if (!argv['disable-hot-schema']) {
      try {
        const pgClient = await this.pgPool.connect();
        await pgClient.query(`LISTEN "${hashName(dbSchema, 'schema_channel', '_metadata')}"`);

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
        ? ApolloServerPluginLandingPageGraphQLPlayground({
            settings: argv['playground-settings'] ? JSON.parse(argv['playground-settings']) : undefined,
          })
        : ApolloServerPluginLandingPageDisabled(),
      queryComplexityPlugin({schema, maxComplexity: argv['query-complexity']}),
      queryDepthLimitPlugin({schema, maxDepth: argv['query-depth-limit']}),
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
      // TODO: Replace subscriptions-transport-ws with graphql-ws when support is added to graphql-playground
      SubscriptionServer.create({schema, execute, subscribe}, {server: httpServer, path: '/'});
    }

    app.use(ExpressPinoLogger(PinoConfig));

    await server.start();
    server.applyMiddleware({
      app,
      path: '/',
      cors: true,
    });
    return server;
  }
}
