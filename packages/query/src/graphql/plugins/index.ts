// Copyright 2020-2021 OnFinality Limited authors & contributors
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
import PgConnectionArgCondition from 'graphile-build-pg/node8plus/plugins/PgConnectionArgCondition';
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
  PgConnectionArgCondition,
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

export const plugins = [
  ...defaultPlugins,
  ...pgDefaultPlugins,
  PgSimplifyInflectorPlugin,
  PgManyToManyPlugin,
  ConnectionFilterPlugin,
];

// todo
// adv filter plugin: https://github.com/graphile-contrib/postgraphile-plugin-connection-filter
