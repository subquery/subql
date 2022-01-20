// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import AddAggregateTypesPlugin from '@graphile/pg-aggregates/dist/AddAggregateTypesPlugin';
import AddConnectionAggregatesPlugin from '@graphile/pg-aggregates/dist/AddConnectionAggregatesPlugin';
import AddConnectionGroupedAggregatesPlugin from '@graphile/pg-aggregates/dist/AddConnectionGroupedAggregatesPlugin';
import AddGroupByAggregateEnumsPlugin from '@graphile/pg-aggregates/dist/AddGroupByAggregateEnumsPlugin';
import AddGroupByAggregateEnumValuesForColumnsPlugin from '@graphile/pg-aggregates/dist/AddGroupByAggregateEnumValuesForColumnsPlugin';
import AddHavingAggregateTypesPlugin from '@graphile/pg-aggregates/dist/AddHavingAggregateTypesPlugin';
import AggregateSpecsPlugin from '@graphile/pg-aggregates/dist/AggregateSpecsPlugin';
import FilterRelationalAggregatesPlugin from '@graphile/pg-aggregates/dist/FilterRelationalAggregatesPlugin';
import InflectionPlugin from '@graphile/pg-aggregates/dist/InflectionPlugin';
import OrderByAggregatesPlugin from '@graphile/pg-aggregates/dist/OrderByAggregatesPlugin';

import type {Plugin} from 'graphile-build';
import type {PgAttribute, PgType, SQL, PgProc} from 'graphile-build-pg';
import {makePluginByCombiningPlugins} from 'graphile-utils';

import {argv} from '../../yargs';

const unsafe = argv('unsafe') as boolean;

interface AggregateGroupBySpec {
  /** Must not change since it's used in type names/etc */
  id: string; // e.g. 'truncated-to-hour'

  /** Return true if we can process this type */
  isSuitableType: (type: PgType) => boolean;

  /** Return false if we cannot process this attribute (default: true) */
  shouldApplyToEntity?: (entity: PgAttribute | PgProc) => boolean;

  /** Wraps the SQL to return a derivative (e.g. sqlFrag => sql.fragment`date_trunc('hour', ${sqlFrag})`) */
  sqlWrap: (sqlFrag: SQL) => SQL;
}

interface AggregateSpec {
  /** Must not change since it's used in type names/etc */
  id: string;

  /** Used in descriptions, starts with lowercase */
  humanLabel: string;

  /** Used in descriptions, starts with uppercase */
  HumanLabel: string;

  /** Return true if we can process this type */
  isSuitableType: (type: PgType) => boolean;

  /** Return false if we cannot process this attribute (default: true) */
  shouldApplyToEntity?: (entity: PgAttribute | PgProc) => boolean;

  /** Wraps the SQL in an aggregate call */
  sqlAggregateWrap: (sqlFrag: SQL) => SQL;

  /**
   * Used to translate the PostgreSQL return type for the aggregate; for example:
   *
   * - Sum over int should give bigint
   * - Average of int should be float
   * - Median of int should be int
   */
  pgTypeAndModifierModifier?: (
    pgType: PgType,
    pgTypeModifier: null | string | number
  ) => [PgType, null | string | number];

  /** Set true if the result is guaranteed to be non-null */
  isNonNull?: boolean;
}

// overwrite the official plugin: https://github.com/graphile/pg-aggregates/blob/main/src/AggregateSpecsPlugin.ts
// Removes all aggregation functions when not using --unsafe flag.

const AggregateSpecsPluginSafe: Plugin = (builder) => {
  builder.hook('build', (build) => {
    const pgAggregateSpecs: AggregateSpec[] = [];
    const pgAggregateGroupBySpecs: AggregateGroupBySpec[] = [];

    return build.extend(build, {
      pgAggregateSpecs,
      pgAggregateGroupBySpecs,
    });
  });
};

const plugins = [
  InflectionPlugin,
  AddGroupByAggregateEnumsPlugin,
  AddGroupByAggregateEnumValuesForColumnsPlugin,
  AddHavingAggregateTypesPlugin,
  AddAggregateTypesPlugin,
  AddConnectionAggregatesPlugin,
  AddConnectionGroupedAggregatesPlugin,
  OrderByAggregatesPlugin,
  FilterRelationalAggregatesPlugin,
];

let PgAggregationPlugin: Plugin;

if (unsafe) {
  PgAggregationPlugin = makePluginByCombiningPlugins(...plugins, AggregateSpecsPlugin);
} else {
  PgAggregationPlugin = makePluginByCombiningPlugins(...plugins, AggregateSpecsPluginSafe);
}

export default PgAggregationPlugin;
