// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// Type declarations for postgraphile v5 subpath exports.
// These are needed because the root tsconfig uses moduleResolution: "node"
// which cannot resolve package.json "exports" fields.

declare module 'postgraphile' {
  import type {GraphQLSchema} from 'graphql';

  export interface PostGraphileInstance {
    createServ<TGrafserv>(grafserv: (config: any) => TGrafserv): TGrafserv;
    getSchemaResult(): Promise<any>;
    getSchema(): Promise<GraphQLSchema>;
    getResolvedPreset(): any;
    release(): Promise<void>;
  }

  export function makeSchema(preset: any): Promise<{schema: GraphQLSchema; resolvedPreset: any}>;
  export function watchSchema(
    preset: any,
    callback: (fatalError: Error | null, params?: any) => void
  ): Promise<() => void>;
  export function postgraphile(preset: any): PostGraphileInstance;
  export default postgraphile;
}

declare module 'postgraphile/presets/amber' {
  export const PostGraphileAmberPreset: any;
  export const orderedPlugins: any[];
}

declare module 'postgraphile/@dataplan/pg/adaptors/pg' {
  export function makePgService(options: any): any;
  export function makePgAdaptorWithPgClient(pool: any, release?: () => void): any;
  export function createWithPgClient(pool: any): any;
  export class PgSubscriber {
    constructor(pool: any);
    listen(channel: string, handler: (payload: string) => void): void;
    unlisten(channel: string): void;
    close(): void;
  }
}

declare module 'postgraphile/grafserv/express/v4' {
  export class ExpressGrafserv {
    constructor(config: any);
    addTo(app: any, server?: any, addExclusiveWebsocketHandler?: boolean): void;
    onRelease(callback: () => void): void;
    release(): Promise<void>;
  }
  export function grafserv(config: any): ExpressGrafserv;
}

declare module 'postgraphile/graphql' {
  export * from 'graphql';
}

declare module 'postgraphile/utils' {
  export function extendSchema(generator: (build: any) => any, name?: string): any;
  export function gql(strings: TemplateStringsArray, ...values: any[]): any;
  export const EXPORTABLE: any;
}

declare module 'graphql-query-complexity' {
  export function simpleEstimator(args?: any): any;
  export function getComplexity(args?: any): any;
}

declare module 'postgraphile/grafast' {
  export function grafast(options: any): Promise<any>;
  export default grafast;
}

declare module '@graphile/pg-aggregates' {
  import {GraphileConfig} from 'postgraphile';
  export const PgAggregatesPreset: GraphileConfig.Preset;
}

// Extend GraphileConfig.Preset to include pgServices, grafast, grafserv
declare global {
  namespace GraphileConfig {
    interface Preset {
      pgServices?: readonly any[];
      grafast?: Record<string, any>;
      grafserv?: Record<string, any>;
    }
  }
}
