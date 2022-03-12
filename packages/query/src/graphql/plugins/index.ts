// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
import PgBasicsPlugin from 'graphile-build-pg/node8plus/plugins/PgBasicsPlugin';
import PgIntrospectionPlugin from 'graphile-build-pg/node8plus/plugins/PgIntrospectionPlugin';
import PgTypesPlugin from 'graphile-build-pg/node8plus/plugins/PgTypesPlugin';
import PgTablesPlugin from 'graphile-build-pg/node8plus/plugins/PgTablesPlugin';
import PgConnectionArgOrderBy from 'graphile-build-pg/node8plus/plugins/PgConnectionArgOrderBy';
import PgConnectionArgOrderByDefaultValue from 'graphile-build-pg/node8plus/plugins/PgConnectionArgOrderByDefaultValue';
import PgConditionComputedColumnPlugin from 'graphile-build-pg/node8plus/plugins/PgConditionComputedColumnPlugin';
import PgAllRows from 'graphile-build-pg/node8plus/plugins/PgAllRows';
import PgColumnsPlugin from 'graphile-build-pg/node8plus/plugins/PgColumnsPlugin';
import PgColumnDeprecationPlugin from 'graphile-build-pg/node8plus/plugins/PgColumnDeprecationPlugin';
import PgForwardRelationPlugin from 'graphile-build-pg/node8plus/plugins/PgForwardRelationPlugin';
import PgRowByUniqueConstraint from 'graphile-build-pg/node8plus/plugins/PgRowByUniqueConstraint';
import PgComputedColumnsPlugin from 'graphile-build-pg/node8plus/plugins/PgComputedColumnsPlugin';
import PgQueryProceduresPlugin from 'graphile-build-pg/node8plus/plugins/PgQueryProceduresPlugin';
import PgOrderAllColumnsPlugin from 'graphile-build-pg/node8plus/plugins/PgOrderAllColumnsPlugin';
import PgOrderComputedColumnsPlugin from 'graphile-build-pg/node8plus/plugins/PgOrderComputedColumnsPlugin';
import PgOrderByPrimaryKeyPlugin from 'graphile-build-pg/node8plus/plugins/PgOrderByPrimaryKeyPlugin';
import PgRowNode from 'graphile-build-pg/node8plus/plugins/PgRowNode';
import PgNodeAliasPostGraphile from 'graphile-build-pg/node8plus/plugins/PgNodeAliasPostGraphile';
import PgRecordReturnTypesPlugin from 'graphile-build-pg/node8plus/plugins/PgRecordReturnTypesPlugin';
import PgRecordFunctionConnectionPlugin from 'graphile-build-pg/node8plus/plugins/PgRecordFunctionConnectionPlugin';
import PgScalarFunctionConnectionPlugin from 'graphile-build-pg/node8plus/plugins/PgScalarFunctionConnectionPlugin';
import PageInfoStartEndCursor from 'graphile-build-pg/node8plus/plugins/PageInfoStartEndCursor';
import PgConnectionTotalCount from 'graphile-build-pg/node8plus/plugins/PgConnectionTotalCount';

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
import {PgSubscriptionPlugin} from './PgSubscriptionPlugin';

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
  PgConnectionArgOrderBy,
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
  PgSimplifyInflectorPlugin,
  PgManyToManyPlugin,
  ConnectionFilterPlugin,
  smartTagsPlugin,
  GetMetadataPlugin,
  PgAggregationPlugin,
  PgSubscriptionPlugin,
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
