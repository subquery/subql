// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import PgPubSub from '@graphile/pg-pubsub';
import {Module, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {HttpAdapterHost} from '@nestjs/core';
import {
  ApolloServerPluginCacheControl,
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginLandingPageGraphQLPlayground,
} from 'apollo-server-core';
import {ApolloServer} from 'apollo-server-express';
import ExpressPinoLogger from 'express-pino-logger';
import {execute, subscribe} from 'graphql';
import {Pool} from 'pg';
import {makePluginHook} from 'postgraphile';
import {getPostGraphileBuilder, PostGraphileCoreOptions} from 'postgraphile-core';
import {SubscriptionServer} from 'subscriptions-transport-ws';
import {Config} from '../configure';
import {PinoConfig} from '../utils/logger';
import {getYargsOption} from '../yargs';
import {plugins} from './plugins';
import {PgSubscriptionPlugin} from './plugins/PgSubscriptionPlugin';
import {queryComplexityPlugin} from './plugins/QueryComplexityPlugin';
import {queryLogPlugin} from './plugins/QueryLogPlugin';
import {ProjectService} from './project.service';

const {argv} = getYargsOption();

@Module({
  providers: [ProjectService],
})
export class GraphqlModule implements OnModuleInit, OnModuleDestroy {
  private apolloServer: ApolloServer;

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
    this.apolloServer = await this.createServer();
  }

  async onModuleDestroy(): Promise<void> {
    return this.apolloServer?.stop();
  }

  private async createServer() {
    const app = this.httpAdapterHost.httpAdapter.getInstance();
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();

    const dbSchema = await this.projectService.getProjectSchema(this.config.get('name'));

    let options: PostGraphileCoreOptions = {
      replaceAllPlugins: plugins,
      subscriptions: true,
      dynamicJson: true,
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

    const builder = await getPostGraphileBuilder(this.pgPool, [dbSchema], options);

    const schema = builder.buildSchema();

    const apolloServerPlugins = [
      ApolloServerPluginCacheControl({
        defaultMaxAge: 5,
        calculateHttpHeaders: true,
      }),
      this.config.get('playground')
        ? ApolloServerPluginLandingPageGraphQLPlayground()
        : ApolloServerPluginLandingPageDisabled(),
      queryComplexityPlugin({schema, maxComplexity: argv['query-complexity']}),
      queryLogPlugin,
    ];

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
