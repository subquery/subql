// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {QueryBuilder} from '@subql/x-graphile-build-pg';
import {Plugin, Context} from 'graphile-build';
import {GraphQLInt, GraphQLString} from 'graphql';
import {makeRangeQuery, hasBlockRange} from './utils';

function addRangeQuery(queryBuilder: QueryBuilder, sql: any) {
  if (queryBuilder.context.args.blockRange) {
    queryBuilder.where(makeRangeQuery(queryBuilder.getTableAlias(), queryBuilder.context.args.blockRange, sql, true));
  } else if(queryBuilder.context.args.blockHeight) {
    queryBuilder.where(makeRangeQuery(queryBuilder.getTableAlias(), queryBuilder.context.args.blockHeight, sql));
  }
}

// Save blockHeight/blockRange to context, so it gets passed down to children
function addQueryContext(queryBuilder: QueryBuilder, sql: any, blockFilter: any, isBlockRangeQuery = false) {
  // check if it's a 'blockRange' type query
  if (isBlockRangeQuery) {
    if (!queryBuilder.context.args?.blockRange || !queryBuilder.parentQueryBuilder) {
      queryBuilder.context.args = {blockRange: [sql.value(blockFilter[0]), sql.value(blockFilter[1])]};
    }
  } else if (!queryBuilder.context.args?.blockHeight || !queryBuilder.parentQueryBuilder) {
      queryBuilder.context.args = {blockHeight: sql.fragment`${sql.value(blockFilter)}::bigint`};
  }
}

export const PgBlockHeightPlugin: Plugin = (builder) => {
  // Adds blockHeight or blockRange condition to join clause when joining a table that has _block_range column
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

      addArgDataGenerator(({blockHeight, blockRange}) => ({
        pgQuery: (queryBuilder: QueryBuilder) => {
          if (blockRange && Array.isArray(blockRange)) {
            addQueryContext(queryBuilder, sql, blockRange, true);
          } else if(blockHeight) {
            addQueryContext(queryBuilder, sql, blockRange);
          }
          addRangeQuery(queryBuilder, sql);
        },
      }));
      return field;
    }
  );
  // Adds blockHeight and blockRange arguments to single entity and connection queries for tables with _block_range column
  builder.hook(
    'GraphQLObjectType:fields:field:args',
    (
      args,
      {extend, graphql: {GraphQLList, GraphQLNonNull}, pgSql: sql},
      {addArgDataGenerator, scope: {isPgFieldConnection, isPgRowByUniqueConstraintField, pgFieldIntrospection}}
    ) => {
      if (!isPgRowByUniqueConstraintField && !isPgFieldConnection) {
        return args;
      }
      if (!hasBlockRange(pgFieldIntrospection)) {
        return args;
      }

      addArgDataGenerator(({blockHeight, blockRange}) => ({
        pgQuery: (queryBuilder: QueryBuilder) => {
          if (blockRange && Array.isArray(blockRange)) {
            addQueryContext(queryBuilder, sql, blockRange, true);
          } else if(blockHeight) {
            addQueryContext(queryBuilder, sql, blockRange);
          }
          addRangeQuery(queryBuilder, sql);
        },
      }));

      return extend(args, {
        blockHeight: {
          description: 'Block height',
          defaultValue: '9223372036854775807',
          type: GraphQLString, // String because of int overflow
        },
        blockRange: {
          description: 'Filter by a range of block heights',
          type: new GraphQLList(new GraphQLNonNull(GraphQLInt)),
        },
      });
    }
  );
};
