// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Module, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {HttpAdapterHost} from '@nestjs/core';
import {
  ApolloServerPluginCacheControl,
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginLandingPageGraphQLPlayground,
} from 'apollo-server-core';
import {ApolloServer} from 'apollo-server-express';
import ExpressPinoLogger from 'express-pino-logger';
import {Pool} from 'pg';
import {getPostGraphileBuilder} from 'postgraphile-core';
import {Config} from '../configure';
import {PinoConfig} from '../utils/logger';
import {plugins} from './plugins';
import {LogGraphqlPlugin} from './plugins/logGraphqlPlugin';
import {ProjectService} from './project.service';

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
    const builder = await getPostGraphileBuilder(this.pgPool, [dbSchema], {
      replaceAllPlugins: plugins,
      subscriptions: true,
      dynamicJson: true,
    });

    const schema = builder.buildSchema();
    const server = new ApolloServer({
      schema,
      context: {
        pgClient: this.pgPool,
      },
      plugins: [
        ApolloServerPluginCacheControl({
          defaultMaxAge: 5,
          calculateHttpHeaders: true,
        }),
        this.config.get('playground')
          ? ApolloServerPluginLandingPageGraphQLPlayground()
          : ApolloServerPluginLandingPageDisabled(),
        LogGraphqlPlugin,
      ],
      debug: this.config.get('NODE_ENV') !== 'production',
    });

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
