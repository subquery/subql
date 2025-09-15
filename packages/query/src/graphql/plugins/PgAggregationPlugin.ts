// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import AddAggregateTypesPlugin from '@graphile/pg-aggregates/dist/AddAggregateTypesPlugin';
import AddConnectionAggregatesPlugin from '@graphile/pg-aggregates/dist/AddConnectionAggregatesPlugin';
import AddConnectionGroupedAggregatesPlugin from '@graphile/pg-aggregates/dist/AddConnectionGroupedAggregatesPlugin';
import AddGroupByAggregateEnumsPlugin from '@graphile/pg-aggregates/dist/AddGroupByAggregateEnumsPlugin';
import AddGroupByAggregateEnumValuesForColumnsPlugin from '@graphile/pg-aggregates/dist/AddGroupByAggregateEnumValuesForColumnsPlugin';
import AddHavingAggregateTypesPlugin from '@graphile/pg-aggregates/dist/AddHavingAggregateTypesPlugin';
// TODO: This method can ensure that the retrieved bigfloat data is correct, but when there is a WHERE condition, it may retrieve incorrect data.
// Refer to unit test `AggregateSpecsPlugin support big number`.
// The same issues: https://github.com/graphile/pg-aggregates/issues/39
// import AggregateSpecsPlugin from './PgAggregateSpecsPlugin';
import AggregateSpecsPlugin from '@graphile/pg-aggregates/dist/AggregateSpecsPlugin';
import FilterRelationalAggregatesPlugin from '@graphile/pg-aggregates/dist/FilterRelationalAggregatesPlugin';
import InflectionPlugin from '@graphile/pg-aggregates/dist/InflectionPlugin';
import {AggregateSpec, AggregateGroupBySpec} from '@graphile/pg-aggregates/dist/interfaces';

import type {Plugin} from 'graphile-build';
import {makePluginByCombiningPlugins} from 'graphile-utils';
import {argv} from '../../yargs';
import OrderByAggregatesPlugin from './PgOrderByAggregatesPlugin';

const aggregate = argv('aggregate') as boolean;

// overwrite the official plugin: https://github.com/graphile/pg-aggregates/blob/main/src/AggregateSpecsPlugin.ts
// Removes all aggregation functions when not using --aggregate flag.

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

if (aggregate) {
  PgAggregationPlugin = makePluginByCombiningPlugins(...plugins, AggregateSpecsPlugin);
} else {
  PgAggregationPlugin = makePluginByCombiningPlugins(...plugins, AggregateSpecsPluginSafe);
}

export default PgAggregationPlugin;
