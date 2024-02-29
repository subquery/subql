// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

/* eslint-disable */
import {
  SwallowErrorsPlugin,
  StandardTypesPlugin,
  NodePlugin,
  QueryPlugin,
  MutationPlugin,
  SubscriptionPlugin,
  ClientMutationIdDescriptionPlugin,
  MutationPayloadQueryPlugin,
  AddQueriesToSubscriptionsPlugin,
  TrimEmptyDescriptionsPlugin,
} from 'graphile-build/node8plus/plugins';
import PgBasicsPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgBasicsPlugin';
import PgIntrospectionPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgIntrospectionPlugin';
import PgTypesPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgTypesPlugin';
import PgTablesPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgTablesPlugin';
import PgConnectionArgOrderByDefaultValue from '@subql/x-graphile-build-pg/node8plus/plugins/PgConnectionArgOrderByDefaultValue';
import PgConditionComputedColumnPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgConditionComputedColumnPlugin';
import PgAllRows from '@subql/x-graphile-build-pg/node8plus/plugins/PgAllRows';
import PgColumnsPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgColumnsPlugin';
import PgColumnDeprecationPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgColumnDeprecationPlugin';
import PgForwardRelationPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgForwardRelationPlugin';
import PgRowByUniqueConstraint from '@subql/x-graphile-build-pg/node8plus/plugins/PgRowByUniqueConstraint';
import PgComputedColumnsPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgComputedColumnsPlugin';
import PgQueryProceduresPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgQueryProceduresPlugin';
import PgOrderAllColumnsPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgOrderAllColumnsPlugin';
import PgOrderComputedColumnsPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgOrderComputedColumnsPlugin';
import PgOrderByPrimaryKeyPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgOrderByPrimaryKeyPlugin';
import PgRowNode from '@subql/x-graphile-build-pg/node8plus/plugins/PgRowNode';
import PgNodeAliasPostGraphile from '@subql/x-graphile-build-pg/node8plus/plugins/PgNodeAliasPostGraphile';
import PgRecordReturnTypesPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgRecordReturnTypesPlugin';
import PgRecordFunctionConnectionPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgRecordFunctionConnectionPlugin';
import PgScalarFunctionConnectionPlugin from '@subql/x-graphile-build-pg/node8plus/plugins/PgScalarFunctionConnectionPlugin';
import PageInfoStartEndCursor from '@subql/x-graphile-build-pg/node8plus/plugins/PageInfoStartEndCursor';
import PgConnectionTotalCount from '@subql/x-graphile-build-pg/node8plus/plugins/PgConnectionTotalCount';

import PgSimplifyInflectorPlugin from '@graphile-contrib/pg-simplify-inflector';
import PgManyToManyPlugin from '@graphile-contrib/pg-many-to-many';
import ConnectionFilterPlugin from 'postgraphile-plugin-connection-filter';

// custom plugins
import PgConnectionArgFirstLastBeforeAfter from './PgConnectionArgFirstLastBeforeAfter';
import PgBackwardRelationPlugin from './PgBackwardRelationPlugin';
import {GetMetadataPlugin} from './GetMetadataPlugin';
import {smartTagsPlugin} from './smartTagsPlugin';
import {makeAddInflectorsPlugin} from 'graphile-utils';
import PgAggregationPlugin from './PgAggregationPlugin';
import {PgRowByVirtualIdPlugin} from './PgRowByVirtualIdPlugin';
import {PgDistinctPlugin} from './PgDistinctPlugin';
import PgConnectionArgOrderBy from './PgOrderByUnique';
import historicalPlugins from './historical';

/* eslint-enable */

export const defaultPlugins = [
  SwallowErrorsPlugin,
  StandardTypesPlugin,
  NodePlugin,
  QueryPlugin,
  MutationPlugin,
  SubscriptionPlugin,
  ClientMutationIdDescriptionPlugin,
  MutationPayloadQueryPlugin,
  AddQueriesToSubscriptionsPlugin,
  TrimEmptyDescriptionsPlugin,
];

export const pgDefaultPlugins = [
  PgBasicsPlugin,
  PgIntrospectionPlugin,
  PgTypesPlugin,
  // PgJWTPlugin,
  PgTablesPlugin,
  PgConnectionArgFirstLastBeforeAfter,
  PgConnectionArgOrderByDefaultValue,
  PgConditionComputedColumnPlugin,
  PgAllRows,
  PgColumnsPlugin,
  PgColumnDeprecationPlugin,
  PgForwardRelationPlugin,
  PgBackwardRelationPlugin,
  PgRowByUniqueConstraint,
  PgComputedColumnsPlugin,
  PgQueryProceduresPlugin,
  PgOrderAllColumnsPlugin,
  PgOrderComputedColumnsPlugin,
  PgOrderByPrimaryKeyPlugin,
  PgRowNode,
  PgNodeAliasPostGraphile,
  PgRecordReturnTypesPlugin,
  PgRecordFunctionConnectionPlugin,
  PgScalarFunctionConnectionPlugin, // For PostGraphile compatibility
  PageInfoStartEndCursor, // For PostGraphile compatibility
  PgConnectionTotalCount,
];

const plugins = [
  ...defaultPlugins,
  ...pgDefaultPlugins,
  ...historicalPlugins,
  PgConnectionArgOrderBy,
  PgSimplifyInflectorPlugin,
  PgManyToManyPlugin,
  ConnectionFilterPlugin,
  smartTagsPlugin,
  GetMetadataPlugin,
  PgAggregationPlugin,
  PgRowByVirtualIdPlugin,
  PgDistinctPlugin,
  makeAddInflectorsPlugin((inflectors) => {
    const {constantCase: oldConstantCase} = inflectors;
    const enumValues = new Set();
    return {
      enumName: (v: string) => {
        enumValues.add(v);
        return v;
      },
      constantCase: (v: string) => {
        // We don't want to change the names of all enum values to CONSTANT CASE
        // because they could be specified in non CONSTANT CASE in their schema.graphql
        if (enumValues.has(v)) {
          return v;
        } else {
          return oldConstantCase(v);
        }
      },
    };
  }, true),
];

export {plugins};
