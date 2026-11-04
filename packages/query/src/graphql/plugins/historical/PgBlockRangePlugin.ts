// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {QueryBuilder} from '@subql/x-graphile-build-pg';
import {Plugin, Context} from 'graphile-build';
import {GraphQLList, GraphQLString} from 'graphql';
import {hasBlockRange, makeBlockRangeQuery, validateBlockRange} from './utils';

function addBlockRangeQuery(queryBuilder: QueryBuilder, sql: any, blockRange: [string, string]) {
  const tableAlias = queryBuilder.getTableAlias();
  queryBuilder.where(makeBlockRangeQuery(tableAlias, blockRange, sql));
}

function addBlockRangeContext(queryBuilder: QueryBuilder, blockRange: [string, string]) {
  if (!queryBuilder.context.args?.blockRange || !queryBuilder.parentQueryBuilder) {
    queryBuilder.context.args = {
      ...queryBuilder.context.args,
      blockRange,
    };
  }
}

export const PgBlockRangePlugin: Plugin = (builder) => {
  // Add _blockHeight field to entity types that have _block_range
  builder.hook(
    'GraphQLObjectType:fields',
    (fields, build, context) => {
      const {
        scope: {isPgRowType, pgIntrospection: table},
        fieldWithHooks,
      } = context;
      const {pgSql: sql, extend} = build;

      if (!isPgRowType || !table || table.kind !== 'class') return fields;
      if (!hasBlockRange(table)) return fields;

      return extend(fields, {
        _blockHeight: fieldWithHooks(
          '_blockHeight',
          ({addDataGenerator}: {addDataGenerator: any}) => {
            addDataGenerator(() => ({
              pgQuery: (queryBuilder: QueryBuilder) => {
                queryBuilder.select(
                  sql.fragment`lower(${queryBuilder.getTableAlias()}._block_range)`,
                  '__block_height'
                );
              },
            }));
            return {
              type: GraphQLString,
              resolve: (data: any) => {
                const val = data['__block_height'];
                return val != null ? String(val) : null;
              },
            };
          },
          {isPgBlockHeightField: true}
        ),
      });
    }
  );

  // Propagate blockRange to relation fields
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

      addArgDataGenerator(({blockRange}: {blockRange?: string[]}) => {
        const validated = validateBlockRange(blockRange as string[]);
        if (!validated) return {};

        return {
          pgQuery: (queryBuilder: QueryBuilder) => {
            addBlockRangeContext(queryBuilder, validated);
            addBlockRangeQuery(queryBuilder, sql, validated);
          },
        };
      });
      return field;
    }
  );

  // Add blockRange argument to connection queries
  builder.hook(
    'GraphQLObjectType:fields:field:args',
    (
      args,
      {extend, pgSql: sql},
      {
        addArgDataGenerator,
        scope: {isPgFieldConnection, pgFieldIntrospection},
      }: Context<any>
    ) => {
      if (!isPgFieldConnection) {
        return args;
      }
      if (!hasBlockRange(pgFieldIntrospection)) {
        return args;
      }

      addArgDataGenerator(({blockHeight, blockRange, timestamp}: any) => {
        const validated = validateBlockRange(blockRange);
        if (!validated) return {};

        // Don't combine with explicit blockHeight/timestamp
        const hasExplicitBlockHeight = blockHeight && blockHeight !== '9223372036854775807';
        const hasExplicitTimestamp = timestamp && timestamp !== '9223372036854775807';
        if (hasExplicitBlockHeight || hasExplicitTimestamp) return {};

        return {
          pgQuery: (queryBuilder: QueryBuilder) => {
            addBlockRangeContext(queryBuilder, validated);
            addBlockRangeQuery(queryBuilder, sql, validated);
          },
        };
      });

      return extend(args, {
        blockRange: {
          description:
            'Filter by block range [start, end]. Returns all historical entity versions within this range. Use _blockHeight field to see each version\'s block.',
          type: new GraphQLList(GraphQLString),
        },
      });
    }
  );
};
