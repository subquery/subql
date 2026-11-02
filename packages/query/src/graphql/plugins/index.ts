// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {PgAggregatesPreset} from '@graphile/pg-aggregates';
import {PgSimplifyInflectionPreset} from '@graphile/simplify-inflection';
import {PgManyToManyPreset} from '@graphile-contrib/pg-many-to-many';
import {PgOrderByRelatedPlugin} from '@graphile-contrib/pg-order-by-related';
import {METADATA_REGEX, MULTI_METADATA_REGEX, MULTI_GLOBAL_REGEX} from '@subql/utils';
import {pgSmartTags} from 'graphile-utils';
import {PostGraphileAmberPreset} from 'postgraphile/presets/amber';
import {PostGraphileConnectionFilterPreset} from 'postgraphile-plugin-connection-filter';
import {getYargsOption} from '../../yargs';
import {GetMetadataPlugin} from './GetMetadataPlugin';
import historicalPlugins from './historical';
import {PgAggregatesHistoricalPlugin} from './PgAggregatesHistoricalPlugin';
import {PgConnectionFirstLastClampPlugin} from './PgConnectionFirstLastClampPlugin';
import {PgDistinctPlugin} from './PgDistinctPlugin';
import {PgOrderByUniquePlugin} from './PgOrderByUnique';
// PgRowByVirtualIdPlugin — replaced by v5 native tableByRowId(rowId: String!) from PgRelationsPlugin.
import {PgSearchPlugin} from './PgSearchPlugin';
import {PgSubscriptionPlugin} from './PgSubscriptionPlugin';

const {argv} = getYargsOption();
const aggregateEnabled = argv.aggregate as boolean;

// Wraps aggregate specs to cast results to ::text, preventing precision loss
// on large numeric/bigint values (matches v4 PgAggregateSpecsPlugin behavior).
// Also handles --aggregate flag gating: when disabled, clears all specs.
const PgAggregateTextCastPlugin: GraphileConfig.Plugin = {
  name: 'PgAggregateTextCastPlugin',
  version: '0.0.0',
  schema: {
    hooks: {
      init(_data: Record<string, never>, build: any): Record<string, never> {
        if (!aggregateEnabled) {
          build.pgAggregateSpecs.length = 0;
          build.pgAggregateGroupBySpecs.length = 0;
          return {};
        }
        const {sql} = build;
        build.pgAggregateSpecs.forEach((spec: any) => {
          if (spec.id?.startsWith('count')) return;
          const origWrap = spec.sqlAggregateWrap;
          if (!origWrap) return;
          spec.sqlAggregateWrap = (sqlFrag: any, ...args: any[]) => {
            const result = origWrap(sqlFrag, ...args);
            return result ? sql`${result}::text` : result;
          };
        });
        return {};
      },
    },
  },
};

const PgFixMetadataFieldPlugin: GraphileConfig.Plugin = {
  name: 'PgFixMetadataFieldPlugin',
  version: '0.0.0',
  inflection: {
    replace: {
      allRowsConnection(previous: ((...args: any[]) => string) | undefined, _options: any, resource: any): string {
        const name = previous?.(resource) ?? resource.name;
        if (name === '_metadata' || resource.name === '_metadata') return '_allMetadata';
        return name;
      },
      allRowsList(previous: ((...args: any[]) => string) | undefined, _options: any, resource: any): string {
        const name = previous?.(resource) ?? resource.name;
        if (name === '_metadata' || resource.name === '_metadata') return '_allMetadata';
        return name;
      },
    },
  },
};

export const queryPreset = {
  extends: [
    PostGraphileAmberPreset,
    PgSimplifyInflectionPreset,
    PostGraphileConnectionFilterPreset,
    PgAggregatesPreset,
    PgManyToManyPreset,
  ],
  disablePlugins: ['PgIndexBehaviorsPlugin', 'PgAggregatesOrderByAggregatesPlugin'],
  plugins: [
    PgOrderByRelatedPlugin,
    ...historicalPlugins,
    PgAggregatesHistoricalPlugin,
    PgAggregateTextCastPlugin,
    PgConnectionFirstLastClampPlugin,
    PgDistinctPlugin,
    PgOrderByUniquePlugin,
    PgSearchPlugin,
    // PgRowByVirtualIdPlugin, // dead code — Node relay field overwrites its accountById(id: String!)
    PgFixMetadataFieldPlugin,
    GetMetadataPlugin,
    ...(argv.subscription ? [PgSubscriptionPlugin] : []),
    // Note: pgSmartTags must run before PgV4SmartTagsPlugin processes omit tags.
    // Using explicit behavior strings instead of omit since the preset extends Amber.
    pgSmartTags([
      // Hide _id from aggregate orderBy enums and read (v5: attribute:select, not attribute:read)
      {kind: 'attribute', match: '_id', tags: {behavior: '-attribute:aggregate:orderBy -attribute:select'}},
      // Hide _block_height from aggregate orderBy enums (but keep for historical filtering)
      {kind: 'attribute', match: '_block_height', tags: {behavior: '-attribute:aggregate:orderBy'}},
      // Hide internal columns from read operations
      {kind: 'attribute', match: '_block_range', tags: {behavior: '-attribute:select'}},
      // Hide metadata and global tables from GraphQL schema
      // -select prevents connection/list/single/list queries
      // -node prevents the node interface from being added
      // -typeField prevents the type from being accessible
      // Matches _metadata (exact via METADATA_REGEX) and _metadata_<suffix> (multi-chain via MULTI_METADATA_REGEX) — uses same regex constants as v4 smartTagsPlugin
      {
        kind: 'class',
        match: (pgClass: any) => METADATA_REGEX.test(pgClass.relname) || MULTI_METADATA_REGEX.test(pgClass.relname),
        tags: {behavior: '-select -node -typeField -connection -single -list -array'},
      },
      {
        kind: 'class',
        match: (pgClass: any) => MULTI_GLOBAL_REGEX.test(pgClass.relname),
        tags: {behavior: '-select -node -typeField -connection -single -list -array'},
      },
    ]),
  ],
  inflection: {
    replace: {
      // Preserve original enum value casing instead of converting to SCREAMING_SNAKE_CASE
      enumName: (_previous: any, v: string) => v,
    },
  },
  schema: {
    pgDynamicJson: true,
  },
};
