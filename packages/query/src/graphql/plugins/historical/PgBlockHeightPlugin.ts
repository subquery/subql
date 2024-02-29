// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {QueryBuilder} from '@subql/x-graphile-build-pg';
import {Plugin, Context} from 'graphile-build';
import {GraphQLString} from 'graphql';
import {makeRangeQuery, hasBlockRange} from './utils';

function addRangeQuery(queryBuilder: QueryBuilder, sql: any) {
  queryBuilder.where(makeRangeQuery(queryBuilder.getTableAlias(), queryBuilder.context.args.blockHeight, sql));
}

// Save blockHeight to context, so it gets passed down to children
function addQueryContext(queryBuilder: QueryBuilder, sql: any, blockHeight: any) {
  if (!queryBuilder.context.args?.blockHeight || !queryBuilder.parentQueryBuilder) {
    queryBuilder.context.args = {blockHeight: sql.fragment`${sql.value(blockHeight)}::bigint`};
  }
}

export const PgBlockHeightPlugin: Plugin = (builder) => {
  // Adds blockHeight condition to join clause when joining a table that has _block_range column
  builder.hook(
    'GraphQLObjectType:fields:field',
    (
      field,
      {pgSql: sql},
      {
        addArgDataGenerator,
        scope: {
          isPgBackwardRelationField,
          isPgBackwardSingleRelationField,
          isPgForwardRelationField,
          pgFieldIntrospection,
        },
      }: Context<any>
    ) => {
      if (!isPgBackwardRelationField && !isPgForwardRelationField && !isPgBackwardSingleRelationField) {
        return field;
      }
      if (!hasBlockRange(pgFieldIntrospection)) {
        return field;
      }

      addArgDataGenerator(({blockHeight}) => ({
        pgQuery: (queryBuilder: QueryBuilder) => {
          addQueryContext(queryBuilder, sql, blockHeight);
          addRangeQuery(queryBuilder, sql);
        },
      }));
      return field;
    }
  );
  // Adds blockHeight argument to single entity and connection queries for tables with _block_range column
  builder.hook(
    'GraphQLObjectType:fields:field:args',
    (
      args,
      {extend, pgSql: sql},
      {addArgDataGenerator, scope: {isPgFieldConnection, isPgRowByUniqueConstraintField, pgFieldIntrospection}}
    ) => {
      if (!isPgRowByUniqueConstraintField && !isPgFieldConnection) {
        return args;
      }
      if (!hasBlockRange(pgFieldIntrospection)) {
        return args;
      }

      addArgDataGenerator(({blockHeight}) => ({
        pgQuery: (queryBuilder: QueryBuilder) => {
          addQueryContext(queryBuilder, sql, blockHeight);
          addRangeQuery(queryBuilder, sql);
        },
      }));

      return extend(args, {
        blockHeight: {
          description: 'Block height',
          defaultValue: '9223372036854775807',
          type: GraphQLString, // String because of int overflow
        },
      });
    }
  );
};
