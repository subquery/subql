// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {HttpAdapterHost} from '@nestjs/core';
import {delay} from '@subql/common';
import compression from 'compression';
import {NextFunction, Request, Response} from 'express';
import {parse} from 'graphql';
import {Pool} from 'pg';
import pinoLogger from 'pino-http';
import {PostGraphileInstance, postgraphile} from 'postgraphile';
import {makePgService} from 'postgraphile/@dataplan/pg/adaptors/pg';
import {ExpressGrafserv} from 'postgraphile/grafserv/express/v4';
import {GraphQLError} from 'postgraphile/graphql';
import {Config} from '../configure';
import {getLogger, PinoConfig} from '../utils/logger';
import {getYargsOption} from '../yargs';
import {queryPreset} from './plugins';
import {checkAliasLimit, getAliasCount} from './plugins/QueryAliasLimitPlugin';
import {validateQueryComplexity, getComplexityValue} from './plugins/QueryComplexityPlugin';
import {validateQueryDepth, getQueryDepth} from './plugins/QueryDepthLimitPlugin';
import {ProjectService} from './project.service';

const {argv} = getYargsOption();
const logger = getLogger('graphql-module');

// Module-level ref to the current PostGraphileInstance for middleware access
let currentPgInstance: PostGraphileInstance | null = null;

const SCHEMA_RETRY_INTERVAL = 10;
const SCHEMA_RETRY_NUMBER = 5;

// Export for testability — allows middleware tests to inject a mock schema
export function setMockPgInstance(instance: PostGraphileInstance | null): void {
  currentPgInstance = instance;
}

/**
 * CORS middleware — replaces v4 `cors: true` on ApolloServer.applyMiddleware.
 * Handles preflight OPTIONS and sets permissive CORS headers.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers?.origin ?? '*';

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

/**
 * Cache-Control middleware — replaces v4 ApolloServerPluginCacheControl({defaultMaxAge: 5}).
 * Patches res.writeHead to inject Cache-Control header right before headers are sent,
 * AFTER downstream (grafserv) sets the status code and any custom cache headers.
 */
export function cacheControlMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const origWriteHead = res.writeHead.bind(res);
  res.writeHead = function (statusCode: number, ...args: any[]) {
    if (statusCode < 400 && !res.headersSent) {
      if (!res.getHeader('Cache-Control')) {
        res.setHeader('Cache-Control', 'public, max-age=5');
      }
    }
    return origWriteHead(statusCode, ...args);
  } as typeof res.writeHead;
  next();
}

/**
 * Error boundary middleware — replaces v4 ApolloServer error formatting.
 * Catches unhandled errors from middleware chain (before grafserv) and returns
 * a proper GraphQL error response instead of crashing the process.
 */
export function errorBoundaryMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error({err}, 'Unhandled middleware error');
  if (res.headersSent) {
    return;
  }
  res.status(500).json({errors: [new GraphQLError(err.message)]});
}

class NoInitError extends Error {
  constructor() {
    super('GraphqlModule has not been initialized');
  }
}

@Module({
  providers: [ProjectService],
})
export class GraphqlModule implements OnModuleInit, OnModuleDestroy {
  private _pgInstance?: PostGraphileInstance;

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
    try {
      await this.createServer();
    } catch (e: any) {
      throw new Error(`create postgraphile server failed, ${e.message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this._pgInstance?.release();
  }

  private makeRuntimePreset(dbSchema: string) {
    const pgService = makePgService({
      pool: this.pgPool,
      schemas: [dbSchema],
    });

    // NOTE: v4 had `graphileBuildOptions.pgUsePartitionedParent: true` for CockroachDB.
    // v5 PgTablesPlugin handles partition tables natively (partitionExclude in plugin),
    // so this compat flag is no longer needed.
    const preset: any = {
      ...queryPreset,
      pgServices: [pgService],
      grafserv: {
        graphqlPath: '/',
        graphiql: this.config.get('playground') ?? true,
        // v5 built-in schema watching — replaces manual LISTEN/NOTIFY
        watch: !argv['disable-hot-schema'],
      },
    };

    if (argv['query-explain']) {
      preset.grafast = {explain: true};
    }

    return preset;
  }

  private async buildSchema(dbSchema: string, retries = SCHEMA_RETRY_NUMBER): Promise<PostGraphileInstance> {
    if (retries <= 0) {
      throw new Error(`Failed to build schema ${dbSchema} ${SCHEMA_RETRY_NUMBER} times`);
    }

    try {
      const preset = this.makeRuntimePreset(dbSchema);
      return postgraphile(preset as any);
    } catch (e: any) {
      await delay(SCHEMA_RETRY_INTERVAL);
      if (retries === 1) {
        logger.error(e);
      }
      return this.buildSchema(dbSchema, --retries);
    }
  }

  private async createServer() {
    const app = this.httpAdapterHost.httpAdapter.getInstance();
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();

    const schemaName = this.config.get<string>('name');
    if (!schemaName) throw new Error('Unable to get schema name from config');

    const dbSchema = await this.projectService.getProjectSchema(schemaName);

    const instance = await this.buildSchema(dbSchema);
    this._pgInstance = instance;
    currentPgInstance = instance;

    // Build the schema eagerly so we fail fast if introspection is broken
    try {
      await instance.getSchema();
    } catch (e: any) {
      throw new Error(`Failed to build schema for ${dbSchema}: ${e.message}`);
    }

    // v5's grafserv.watch handles schema watching internally —
    // no manual LISTEN/NOTIFY setup needed.

    // Create grafserv and mount on Express
    const grafserv = instance.createServ(
      ({preset, schema}) =>
        new ExpressGrafserv({
          preset,
          schema,
        })
    ) as ExpressGrafserv;

    // Mount middleware (order matters: external middleware before grafserv)
    // CORS must be first to handle preflight OPTIONS before any other logic
    app.use(corsMiddleware);
    app.use(cacheControlMiddleware);
    app.use(pinoLogger(PinoConfig));
    app.use(limitBatchedQueries);
    app.use(limitQueryComplexity);
    app.use(limitQueryDepth);
    app.use(limitQueryAliases);
    app.use(compression());

    grafserv.addTo(app, httpServer, true);

    // Error boundary must be last — catches errors from all prior middleware + grafserv
    app.use(errorBoundaryMiddleware);
  }
}

export function limitQueryComplexity(req: Request, res: Response, next: NextFunction): void {
  const maxComplexity = argv['query-complexity'] as number | undefined;
  if (maxComplexity === undefined || req.method !== 'POST') return next();

  // Get current schema from the live instance (grafserv.watch keeps it updated)
  const sr = currentPgInstance?.getSchemaResult();
  const schema = sr && !(sr instanceof Promise) ? (sr as any).schema : null;
  if (!schema) return next();

  const queries = Array.isArray(req.body) ? req.body : [req.body];
  for (const q of queries) {
    if (q?.query) {
      try {
        const doc = parse(q.query);
        // Validate and get complexity value
        const complexity = validateQueryComplexity(doc, q.operationName, q.variables, maxComplexity, schema);

        // Always send complexity header
        res.setHeader('X-Query-Complexity', complexity);
        if (maxComplexity !== undefined) {
          res.setHeader('X-Max-Query-Complexity', maxComplexity);
        }
      } catch (e: any) {
        res.status(400).json({errors: [new GraphQLError(e.message)]});
        return next(e);
      }
    }
  }
  next();
}

export function limitQueryDepth(req: Request, res: Response, next: NextFunction): void {
  const maxDepth = argv['query-depth-limit'] as number | undefined;
  if (maxDepth !== undefined && req.method === 'POST') {
    const queries = Array.isArray(req.body) ? req.body : [req.body];
    for (const q of queries) {
      if (q?.query) {
        try {
          const doc = parse(q.query);
          // Validate and get depth value
          validateQueryDepth(maxDepth, doc.definitions);

          // Get the actual query depth for the header
          const actualDepth = getQueryDepth(doc);
          res.setHeader('X-Query-Depth', actualDepth);
          if (maxDepth !== undefined) {
            res.setHeader('X-Max-Query-Depth', maxDepth);
          }
        } catch (e: any) {
          res.status(400).json({errors: [new GraphQLError(e.message)]});
          return next(e);
        }
      }
    }
  }
  next();
}

export function limitQueryAliases(req: Request, res: Response, next: NextFunction): void {
  const maxAliases = argv['query-alias-limit'] as number | undefined;
  if (maxAliases !== undefined && req.method === 'POST') {
    const queries = Array.isArray(req.body) ? req.body : [req.body];
    for (const q of queries) {
      if (q?.query) {
        try {
          const doc = parse(q.query);
          // Validate and get alias count
          checkAliasLimit(doc, maxAliases);

          // Get the actual alias count for the header
          const actualAliases = getAliasCount(doc);
          res.setHeader('X-Query-Aliases', actualAliases);
          if (maxAliases !== undefined) {
            res.setHeader('X-Max-Query-Aliases', maxAliases);
          }
        } catch (e: any) {
          res.status(400).json({errors: [new GraphQLError(e.message)]});
          return next(e);
        }
      }
    }
  }
  next();
}

export function limitBatchedQueries(req: Request, res: Response, next: NextFunction): void {
  const batchLimit = argv['query-batch-limit'] as number | undefined;
  if (batchLimit !== undefined && req.method === 'POST') {
    const queries = req.body;
    if (Array.isArray(queries) && queries.length > batchLimit) {
      const error = new GraphQLError('Batch query limit exceeded');
      res.status(500).json({errors: [error]});
      return next(error);
    }
    // Always send batch limit header on POST requests
    if (req.method === 'POST') {
      res.setHeader('X-Query-Batches', Array.isArray(queries) ? queries.length : 1);
      if (batchLimit !== undefined) {
        res.setHeader('X-Max-Query-Batches', batchLimit);
      }
    }
  }
  next();
}
