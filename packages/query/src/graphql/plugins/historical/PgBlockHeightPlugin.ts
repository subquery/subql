// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {QueryBuilder} from '@subql/x-graphile-build-pg';
import {Plugin, Context} from 'graphile-build';
import {GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLString} from 'graphql';
import {fetchFromTable} from '../GetMetadataPlugin';
import {makeRangeQuery, hasBlockRange} from './utils';

function addRangeQuery(queryBuilder: QueryBuilder, sql: any) {
  if (queryBuilder.context.args.blockRange) {
    queryBuilder.where(makeRangeQuery(queryBuilder.getTableAlias(), queryBuilder.context.args.blockRange, sql, true));
  } else if (queryBuilder.context.args.blockHeight) {
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

export const PgBlockHeightPlugin: Plugin = async (builder, options) => {
  // Note this varies from node where true is allowed because of legacy support
  let historicalMode: boolean | 'height' | 'timestamp' = 'height';
  const [schemaName] = options.pgSchemas;

  try {
    const {historicalStateEnabled} = await fetchFromTable(options.pgConfig, schemaName, undefined, false);
    historicalMode = historicalStateEnabled;
  } catch (e) {
    /* Do nothing, default value is already set */
  }

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

      addArgDataGenerator(({blockHeight, blockRange, timestamp}) => ({
        pgQuery: (queryBuilder: QueryBuilder) => {
          if (blockRange && Array.isArray(blockRange)) {
            addQueryContext(queryBuilder, sql, blockRange, true);
          } else if (blockHeight) {
            addQueryContext(queryBuilder, sql, blockHeight ?? timestamp);
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
      {extend, pgSql: sql},
      {
        addArgDataGenerator,
        scope: {isPgFieldConnection, isPgRowByUniqueConstraintField, pgFieldIntrospection},
      }: Context<any>
    ) => {
      if (!isPgRowByUniqueConstraintField && !isPgFieldConnection) {
        return args;
      }
      if (!hasBlockRange(pgFieldIntrospection)) {
        return args;
      }

      addArgDataGenerator(({blockHeight, blockRange, timestamp}) => ({
        pgQuery: (queryBuilder: QueryBuilder) => {
          if (blockRange && Array.isArray(blockRange)) {
            addQueryContext(queryBuilder, sql, blockRange, true);
          } else if (blockHeight) {
            addQueryContext(queryBuilder, sql, blockHeight ?? timestamp);
          }
          addRangeQuery(queryBuilder, sql);
        },
      }));

      if (historicalMode === 'timestamp') {
        return extend(args, {
          timestamp: {
            description: 'When specified, the query will return results as of this timestamp. Unix timestamp in MS',
            defaultValue: '9223372036854775807',
            type: GraphQLString, // String because of int overflow
          },
        });
      }

      return extend(args, {
        blockHeight: {
          description: 'When specified, the query will return results as of this block height',
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
